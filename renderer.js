const state = {
  key: '',
  models: [],
  selectedModel: localStorage.getItem('rotul_model') || 'openrouter/free',
  messages: [],
  history: JSON.parse(localStorage.getItem('rotul_history') || '[]'),
  lastFiles: []
};

const $ = id => document.getElementById(id);
const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iconArrow = '<svg class="inline-arrow"><use href="#i-arrow"/></svg>';

function showView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = $('view-' + view);
  if (target) target.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
}

document.addEventListener('click', e => {
  const button = e.target.closest('[data-view]');
  if (button) showView(button.dataset.view);
});

function updateConnection() {
  const connected = !!String(state.key || '').trim();
  $('connection').textContent = connected ? '● Terhubung' : '● Belum terhubung';
  $('connection').style.color = connected ? '#2fa96c' : '#d88b55';
  $('statusDot').style.background = connected ? '#25bd72' : '#e3a25d';
  $('statusTitle').textContent = 'OpenRouter API';
  $('statusText').textContent = connected ? 'Terhubung' : 'Belum terhubung';
}

async function loadKey() {
  state.key = localStorage.getItem('rotul_openrouter_key') || '';
  updateConnection();
}

function isFreeModel(model) {
  const id = String(model?.id || '').toLowerCase();
  const p = Number(model?.pricing?.prompt);
  const c = Number(model?.pricing?.completion);
  return id.endsWith(':free') || (Number.isFinite(p) && Number.isFinite(c) && p === 0 && c === 0);
}

function modelLabel(model) {
  const name = String(model?.name || model?.id || 'Unknown model');
  const cleanName = name.replace(/\s*\(free\)\s*$/ig, '').trim();
  return isFreeModel(model) ? `${cleanName} (free)` : cleanName;
}

function sortModels(models) {
  return models.sort((a,b) => {
    const free = Number(isFreeModel(b)) - Number(isFreeModel(a));
    return free || String(a.name || a.id).localeCompare(String(b.name || b.id));
  });
}

function populateModels() {
  const selects = [$('modelSelect')];
  const freeRouter = { id:'openrouter/free', name:'OpenRouter Free Router', pricing:{prompt:'0',completion:'0'} };
  const models = [freeRouter, ...state.models.filter(m => m.id !== 'openrouter/free')];
  const options = models.map(m => `<option value="${escapeHtml(m.id)}">${escapeHtml(modelLabel(m))}</option>`).join('');
  selects.forEach(select => {
    select.innerHTML = options;
    const exists = models.some(m => m.id === state.selectedModel);
    select.value = exists ? state.selectedModel : 'openrouter/free';
  });
  if (!models.some(m => m.id === state.selectedModel)) state.selectedModel = 'openrouter/free';
  $('answerModel').textContent = state.selectedModel;
}

async function loadModels() {
  if (!state.key) {
    state.models = [];
    populateModels();
    $('modelCount').textContent = '0 model dimuat. Simpan API key untuk memuat katalog.';
    return;
  }
  $('modelCount').textContent = 'Memuat katalog model OpenRouter...';
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', { headers: { Authorization: `Bearer ${state.key}` } });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || `HTTP ${response.status}`);
    state.models = sortModels(data?.data || []);
    populateModels();
    const freeCount = state.models.filter(isFreeModel).length;
    $('modelCount').textContent = `${state.models.length} model dimuat • ${freeCount} model (free).`;
  } catch (e) {
    console.error(e);
    populateModels();
    $('modelCount').textContent = 'Gagal memuat katalog: ' + e.message;
  }
}

function syncModel(value) {
  state.selectedModel = value || 'openrouter/free';
  localStorage.setItem('rotul_model', state.selectedModel);
  $('modelSelect').value = state.selectedModel;
  $('answerModel').textContent = state.selectedModel;
}
$('modelSelect').addEventListener('change', e => syncModel(e.target.value));
$('refreshModels').onclick = loadModels;
$('temp').addEventListener('input', e => $('tempVal').textContent = e.target.value);

function addMessage(role, text) {
  state.messages.push({ role, text });
  renderMessages();
}
function renderMessages() {
  const box = $('messages');
  box.innerHTML = state.messages.map(m => `<div class="msg ${m.role === 'user' ? 'user' : 'ai'}">${escapeHtml(m.text).replace(/\n/g,'<br>')}</div>`).join('');
  box.scrollTop = box.scrollHeight;
}

async function callChat(prompt, system = "Kamu adalah ROTUL, asisten AI berbahasa Indonesia. Jawab jelas, membantu, dan terstruktur.") {
  if (!state.key) throw new Error('Masukkan OpenRouter API Key di Pengaturan terlebih dahulu.');
  const payload = {
    model: state.selectedModel,
    messages: [
      { role:'system', content:system },
      ...state.messages.map(m => ({ role:m.role === 'ai' ? 'assistant' : 'user', content:m.text })),
      { role:'user', content:prompt }
    ],
    temperature: Number($('temp').value),
    max_tokens: Number($('tokens').value) || 4096,
    stream: false,
    apiKey: state.key
  };
  const apiKey = state.key.trim().replace(/^Bearer\s+/i, '');
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': location.origin, 'X-Title': "ROTUL'S AI ULTRA" },
    body: JSON.stringify({ model: payload.model, messages: payload.messages, temperature: payload.temperature, max_tokens: payload.max_tokens, stream: false })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `OpenRouter HTTP ${response.status}`);
  return data?.choices?.[0]?.message?.content || '(Tidak ada jawaban dari model.)';
}

async function sendChat(prompt) {
  if (!prompt.trim()) return;
  $('answer').classList.remove('empty');
  $('answer').textContent = 'ROTUL sedang berpikir...';
  try {
    const answer = await callChat(prompt);
    addMessage('user', prompt);
    addMessage('ai', answer);
    $('answer').textContent = answer;
    const record = { time:new Date().toLocaleString('id-ID'), prompt, answer };
    state.history.unshift(record);
    state.history = state.history.slice(0,100);
    localStorage.setItem('rotul_history', JSON.stringify(state.history));
    renderHistory();
  } catch (e) {
    $('answer').textContent = 'Error: ' + e.message;
  }
}

$('sendBtn').onclick = () => {
  const p = $('prompt').value;
  $('prompt').value = '';
  if (!p.trim()) return;
  showView('chat');
  $('chatPrompt').value = '';
  sendChat(p);
};
$('chatSend').onclick = () => {
  const p = $('chatPrompt').value;
  $('chatPrompt').value = '';
  sendChat(p);
};
$('chatPrompt').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('chatSend').click(); } });
$('prompt').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); $('sendBtn').click(); } });

async function chooseFiles() {
  return new Promise(resolve => {
    const picker = $('filePicker');
    picker.value = '';
    picker.onchange = () => {
      const files = Array.from(picker.files || []).map(file => ({ name: file.name, size: file.size, type: file.type }));
      state.lastFiles = files;
      resolve(files);
    };
    picker.click();
  });
}
$('attachBtn').onclick = async () => {
  const files = await chooseFiles();
  $('prompt').placeholder = files.length ? files.map(f => f.name).join(', ') : 'Tulis pesanmu di sini...';
};
$('imageAttachBtn').onclick = async () => {
  const picker = $('imagePicker');
  picker.value = '';
  picker.onchange = () => { const files = Array.from(picker.files || []); state.lastFiles = files.map(f => ({name:f.name,size:f.size,type:f.type})); $('prompt').placeholder = files.length ? files.map(f => f.name).join(', ') : 'Tulis pesanmu di sini...'; };
  picker.click();
};
$('visionOpen').onclick = async () => {
  const files = await chooseFiles();
  $('visionResult').textContent = files.length ? files.map(f => f.name).join('\n') : 'Tidak ada gambar dipilih.';
};
$('docOpen').onclick = async () => {
  const files = await chooseFiles();
  $('docList').textContent = files.length ? files.map(f => f.name).join('\n') : 'Tidak ada dokumen dipilih.';
};

function renderHistory() {
  const box = $('historyList');
  if (!state.history.length) {
    box.textContent = 'Belum ada riwayat.';
    $('recentList').textContent = 'Belum ada chat.';
    return;
  }
  const html = state.history.map(h => `<div style="padding:12px 0;border-bottom:1px solid #74b8df33"><b>${escapeHtml(h.prompt)}</b><br><small>${escapeHtml(h.time)}</small></div>`).join('');
  box.innerHTML = html;
  $('recentList').innerHTML = html;
}
renderHistory();

async function runFeature(type) {
  const prompt = type === 'code' ? $('codePrompt').value : $('imagePrompt').value;
  const resultBox = type === 'code' ? $('codeResult') : $('imageResult');
  if (!prompt.trim()) return;
  resultBox.textContent = 'Memproses...';
  try {
    if (type === 'code') {
      resultBox.textContent = await callChat('Kamu adalah coding expert. Jelaskan/perbaiki/buat kode untuk permintaan berikut:\n' + prompt);
    } else {
      resultBox.textContent = 'Mode Gambar membutuhkan model image-generation yang kompatibel. Pilih model tersebut dari daftar model terlebih dahulu.';
    }
  } catch (e) { resultBox.textContent = 'Error: ' + e.message; }
}
document.querySelectorAll('.run-feature').forEach(b => b.onclick = () => runFeature(b.dataset.type));

document.querySelectorAll('.tool-card').forEach(b => b.onclick = () => {
  const names = { math:'Selesaikan matematika dengan langkah lengkap.', translate:'Terjemahkan teks berikut dan pertahankan konteks.', table:'Ubah data menjadi tabel yang rapi.', summarize:'Ringkas teks berikut menjadi poin-poin penting.' };
  $('toolResult').textContent = names[b.dataset.tool] + '\n\nMasukkan detail lewat Chat untuk menjalankan alat ini.';
});

function openSettings() {
  $('settingsModal').classList.remove('hidden');
  $('apiKey').value = state.key;
}
$('settingsBtn').onclick = openSettings;
$('fullSettings').onclick = openSettings;
$('changeKey').onclick = openSettings;
$('closeSettings').onclick = () => $('settingsModal').classList.add('hidden');
$('saveKey').onclick = async () => {
  localStorage.setItem('rotul_openrouter_key', $('apiKey').value.trim());
  await loadKey();
  await loadModels();
  $('settingsModal').classList.add('hidden');
};
$('loadModelsBtn').onclick = loadModels;
$('apiKey').addEventListener('keydown', e => { if (e.key === 'Enter') $('saveKey').click(); });

(async () => {
  await loadKey();
  populateModels();
  await loadModels();
  syncModel(state.selectedModel);
})();

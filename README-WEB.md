# ROTUL'S AI ULTRA — Web Edition

Versi web mempertahankan UI dan aset dari project Electron yang diberikan. Dibuat untuk hosting statis GitHub Pages.

## Deploy ke GitHub Pages

1. Buat repository baru di GitHub, misalnya `rotuls-ai-ultra`.
2. Upload **isi folder ini** ke root repository (pastikan `index.html`, `renderer.js`, `style.css`, dan folder `assets/` ada langsung di root).
3. Buka **Settings → Pages**.
4. Pada **Build and deployment**, pilih **Deploy from a branch**.
5. Pilih branch `main`, folder `/(root)`, lalu **Save**.
6. Tunggu GitHub memberikan URL Pages untuk situsmu.

## OpenRouter

- Buka situs web, klik Pengaturan, tempel API key OpenRouter, lalu klik **Simpan API Key**.
- Model akan dimuat dari katalog OpenRouter dan Chat menggunakan model yang dipilih di dropdown atas.
- API key disimpan di `localStorage` browser pada perangkat pengguna; jangan pernah memasukkan API key ke source code atau commit ke GitHub.
- Karena GitHub Pages adalah hosting statis, request OpenRouter berjalan dari browser. Ini cocok untuk penggunaan pribadi. Untuk situs publik dengan banyak pengguna, gunakan backend sendiri agar API key tidak perlu dimasukkan setiap pengguna dan dapat dikelola dengan aman.
- Fitur tertentu seperti membaca isi PDF/DOCX, analisis file penuh, audio/video, dan image generation khusus masih memerlukan implementasi model/API yang sesuai; memilih file pada UI saja tidak berarti file sudah diproses.

## Menjalankan lokal

Buka `index.html` di browser atau jalankan server statis lokal. Tidak diperlukan `npm install` untuk versi web.

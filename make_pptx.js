const pptxgen = require('pptxgenjs');
const fs = require('fs');
const csv = require('csv-parser');

const rows = [];
fs.createReadStream('eksperimen/prompt_results_final.csv')
  .pipe(csv())
  .on('data', (r) => rows.push(r))
  .on('end', () => {
    const totalIn = rows.reduce((s, r) => s + +r['Jumlah Token Input'], 0);
    const totalOut = rows.reduce((s, r) => s + +r['Jumlah Token Output'], 0);
    buildPptx(rows, totalIn, totalOut);
  });

function buildPptx(rows, totalIn, totalOut) {
  const p = new pptxgen();
  p.layout = 'LAYOUT_WIDE';
  p.author = 'ChatBot Project';
  p.title = 'Dashboard Chatbot & Eksperimen Prompt Engineering';

  // Tema warna
  const C = {
    primary: '0F2A43',    // navy
    accent: '00A8A8',     // teal
    accent2: 'F2A104',    // amber
    light: 'F4F7FA',      // bg terang
    text: '22303C',       // teks utama
    muted: '5A6B7B',      // teks sekunder
    white: 'FFFFFF',
  };

  // ---------- Slide 1: Judul ----------
  let s = p.addSlide();
  s.background = { color: C.primary };
  s.addShape('rect', { x: 0, y: 0, w: 0.18, h: '100%', fill: { color: C.accent } });
  s.addText('Dashboard Chatbot', { x: 0.9, y: 1.5, w: 8.5, h: 0.9, fontSize: 44, bold: true, color: C.white, fontFace: 'Segoe UI' });
  s.addText('Monitoring Real-Time & Eksperimen Prompt Engineering', { x: 0.9, y: 2.5, w: 9, h: 0.6, fontSize: 22, color: C.accent, fontFace: 'Segoe UI' });
  s.addText('Node.js · MySQL · Atria Dawn Preview API', { x: 0.9, y: 3.3, w: 9, h: 0.5, fontSize: 15, color: 'B8C7D6', fontFace: 'Segoe UI' });
  s.addText(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), { x: 0.9, y: 4.6, w: 9, h: 0.4, fontSize: 13, color: '8FA3B8', fontFace: 'Segoe UI' });
  s.addNotes('Slide pembuka. Perkenalkan project: dashboard chatbot dengan monitoring real-time dan eksperimen prompt engineering. Teknologi inti: Node.js, MySQL, Atria Dawn Preview API.');

  // ---------- Slide 2: Arsitektur ----------
  s = p.addSlide();
  s.background = { color: C.light };
  addHeader(s, 'Arsitektur Sistem', C);
  const boxes = [
    { x: 0.6, t: 'Frontend', d: 'index.html\nDashboard single-page\nlocalStorage: model & API config', c: C.accent },
    { x: 4.1, t: 'Backend', d: 'server.js (Node.js)\nHTTP server port 3000\nRouting /api/* tanpa framework', c: C.primary },
    { x: 7.6, t: 'Database', d: 'MySQL (XAMPP)\nchatbot_db · chat_history\nPool koneksi mysql2/promise', c: C.accent2 },
  ];
  for (const b of boxes) {
    s.addShape('roundRect', { x: b.x, y: 1.35, w: 3.0, h: 2.1, fill: { color: C.white }, line: { color: b.c, width: 2 }, rectRadius: 0.08 });
    s.addText(b.t, { x: b.x + 0.15, y: 1.5, w: 2.7, h: 0.4, fontSize: 17, bold: true, color: b.c, fontFace: 'Segoe UI' });
    s.addText(b.d, { x: b.x + 0.15, y: 1.95, w: 2.7, h: 1.4, fontSize: 11.5, color: C.text, fontFace: 'Segoe UI', lineSpacing: 16 });
  }
  // Panah
  s.addShape('rightArrow', { x: 3.62, y: 2.15, w: 0.45, h: 0.4, fill: { color: C.muted }, rotate: 0 });
  s.addShape('rightArrow', { x: 7.12, y: 2.15, w: 0.45, h: 0.4, fill: { color: C.muted }, rotate: 0 });
  s.addText('X-Model · X-API-Endpoint · X-API-Key', { x: 0.6, y: 3.65, w: 9.3, h: 0.35, fontSize: 11, italic: true, color: C.muted, align: 'center', fontFace: 'Segoe UI' });
  // API eksternal
  s.addShape('roundRect', { x: 2.35, y: 4.15, w: 6.0, h: 1.0, fill: { color: C.primary }, rectRadius: 0.08 });
  s.addText('Atria AI API — https://api.atria-asi.ai/v1/chat/completions', { x: 2.5, y: 4.25, w: 5.7, h: 0.4, fontSize: 13, bold: true, color: C.white, align: 'center', fontFace: 'Segoe UI' });
  s.addText('Model: Atria-Dawn-Preview · Bearer auth via .env (NINE_API_KEY)', { x: 2.5, y: 4.62, w: 5.7, h: 0.35, fontSize: 11, color: 'B8C7D6', align: 'center', fontFace: 'Segoe UI' });
  s.addNotes('Alur: frontend index.html mengirim request ke server.js (port 3000). Server menyimpan percakapan ke MySQL chatbot_db dan memanggil Atria AI API. Konfigurasi model, endpoint, dan API key dikirim via custom header X-Model, X-API-Endpoint, X-API-Key. API key utama dibaca dari .env (NINE_API_KEY).');

  // ---------- Slide 3: Fitur Dashboard ----------
  s = p.addSlide();
  s.background = { color: C.light };
  addHeader(s, 'Fitur Dashboard', C);
  const feats = [
    ['Overview', '4 kartu metrik: percakapan, token, latency, error rate. Chart aktivitas 7 hari & distribusi token.'],
    ['Live Chat', ' Percakapan langsung dengan chatbot, tracking token input/output per sesi secara real-time.'],
    ['Request Log', '20 request terakhir dengan status sukses/gagal, latency, dan jumlah token.'],
    ['Settings', 'Kelola model AI: pilih model aktif, tambah model custom, hapus model, konfigurasi endpoint & API key.'],
  ];
  feats.forEach((f, i) => {
    const y = 1.35 + i * 1.05;
    s.addShape('roundRect', { x: 0.6, y, w: 8.8, h: 0.92, fill: { color: C.white }, line: { color: 'DCE5EE', width: 1 }, rectRadius: 0.06 });
    s.addShape('rect', { x: 0.6, y, w: 0.07, h: 0.92, fill: { color: C.accent } });
    s.addText(f[0], { x: 0.85, y: y + 0.08, w: 2.0, h: 0.4, fontSize: 15, bold: true, color: C.primary, fontFace: 'Segoe UI' });
    s.addText(f[1], { x: 2.9, y: y + 0.06, w: 6.3, h: 0.8, fontSize: 11.5, color: C.text, fontFace: 'Segoe UI', valign: 'middle' });
  });
  s.addNotes('Empat fitur utama. Overview: kartu metrik percakapan, token, latency, error rate, chart aktivitas 7 hari dan distribusi token. Live Chat: percakapan langsung dengan tracking token input/output per sesi. Request Log: 20 request terakhir dengan status sukses/gagal. Settings: kelola model AI, endpoint, dan API key.');

  // ---------- Slide 4: Skema Database ----------
  s = p.addSlide();
  s.background = { color: C.light };
  addHeader(s, 'Skema Database — chat_history', C);
  const cols = [
    ['id', 'INT AUTO_INCREMENT PRIMARY KEY'],
    ['session_id', 'VARCHAR(64) NOT NULL — index'],
    ['role', "ENUM('user','assistant','system')"],
    ['content', 'TEXT NOT NULL'],
    ['tokens_in', 'INT DEFAULT 0'],
    ['tokens_out', 'INT DEFAULT 0'],
    ['latency_ms', 'INT DEFAULT 0'],
    ['created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'],
  ];
  cols.forEach((c, i) => {
    const y = 1.4 + i * 0.52;
    s.addShape('rect', { x: 0.7, y, w: 8.6, h: 0.46, fill: { color: i % 2 ? C.white : 'E9EFF5' }, line: { color: 'DCE5EE', width: 0.5 } });
    s.addText(c[0], { x: 0.9, y, w: 2.6, h: 0.46, fontSize: 12.5, bold: true, color: C.accent, fontFace: 'Consolas', valign: 'middle' });
    s.addText(c[1], { x: 3.6, y, w: 5.5, h: 0.46, fontSize: 11.5, color: C.text, fontFace: 'Consolas', valign: 'middle' });
  });
  s.addText('Engine: InnoDB · Charset: utf8mb4 · Index: idx_session, idx_created', { x: 0.7, y: 5.75, w: 8.6, h: 0.35, fontSize: 11, italic: true, color: C.muted, fontFace: 'Segoe UI' });
  s.addNotes('Tabel chat_history menyimpan semua pesan. session_id mengelompokkan percakapan, role membedakan user/assistant/system, tokens_in/tokens_out/latency_ms dipakai untuk analisis. Engine InnoDB, charset utf8mb4 agar emoji aman, index pada session dan created_at untuk query cepat.');

  // ---------- Slide 5: API Endpoints ----------
  s = p.addSlide();
  s.background = { color: C.light };
  addHeader(s, 'REST API Endpoints', C);
  const apis = [
    ['POST', '/api/chat', 'Kirim pesan, dapatkan reply + stats token', '{ messages: [{role, content}], sessionId }'],
    ['GET', '/api/stats', 'Metrik server: uptime, requests, error rate, token', '—'],
    ['GET', '/api/history', 'Riwayat percakapan per session', '?sessionId=...'],
    ['GET', '/api/sessions', 'Daftar session ID yang tersimpan', '—'],
  ];
  apis.forEach((a, i) => {
    const y = 1.4 + i * 1.0;
    s.addShape('roundRect', { x: 0.6, y, w: 8.8, h: 0.88, fill: { color: C.white }, line: { color: 'DCE5EE', width: 1 }, rectRadius: 0.06 });
    const methodColor = a[0] === 'POST' ? C.accent2 : C.accent;
    s.addText(a[0], { x: 0.8, y: y + 0.16, w: 0.95, h: 0.4, fontSize: 12, bold: true, color: C.white, align: 'center', fill: { color: methodColor }, fontFace: 'Consolas' });
    s.addText(a[1], { x: 1.9, y: y + 0.14, w: 2.6, h: 0.4, fontSize: 13, bold: true, color: C.primary, fontFace: 'Consolas' });
    s.addText(a[2], { x: 4.6, y: y + 0.08, w: 4.6, h: 0.75, fontSize: 11, color: C.text, fontFace: 'Segoe UI', valign: 'middle' });
    s.addText('Body/Query: ' + a[3], { x: 1.9, y: y + 0.52, w: 7.3, h: 0.3, fontSize: 9.5, italic: true, color: C.muted, fontFace: 'Consolas' });
  });
  s.addNotes('Empat endpoint. POST /api/chat menerima array messages plus sessionId dan mengembalikan reply beserta stats token. GET /api/stats untuk metrik server (uptime, requests, error rate). GET /api/history dan /api/sessions untuk riwayat percakapan. Routing manual tanpa framework Express.');

  // ---------- Slide 6: Eksperimen Prompt Engineering ----------
  s = p.addSlide();
  s.background = { color: C.light };
  addHeader(s, 'Eksperimen Prompt Engineering', C);
  s.addText('28 kombinasi teknik prompting diuji ke Atria Dawn Preview, masing-masing dijalankan dan diukur token input/output-nya.', { x: 0.6, y: 1.3, w: 8.8, h: 0.5, fontSize: 13, color: C.text, fontFace: 'Segoe UI' });
  // Kartu statistik
  const stats = [
    ['28', 'Kombinasi diuji', C.accent],
    [totalIn.toLocaleString('id-ID'), 'Total Token Input', C.primary],
    [totalOut.toLocaleString('id-ID'), 'Total Token Output', C.accent2],
    [(totalIn + totalOut).toLocaleString('id-ID'), 'Total Token Keseluruhan', C.primary],
  ];
  stats.forEach((st, i) => {
    const x = 0.6 + i * 2.28;
    s.addShape('roundRect', { x, y: 2.0, w: 2.08, h: 1.35, fill: { color: C.white }, line: { color: 'DCE5EE', width: 1 }, rectRadius: 0.08 });
    s.addText(st[0], { x, y: 2.15, w: 2.08, h: 0.55, fontSize: 26, bold: true, color: st[2], align: 'center', fontFace: 'Segoe UI' });
    s.addText(st[1], { x, y: 2.75, w: 2.08, h: 0.45, fontSize: 10.5, color: C.muted, align: 'center', fontFace: 'Segoe UI' });
  });
  s.addText(`Rata-rata: ${Math.round(totalIn / rows.length)} token input · ${Math.round(totalOut / rows.length)} token output per prompt`, { x: 0.6, y: 3.55, w: 8.8, h: 0.35, fontSize: 12, italic: true, color: C.muted, fontFace: 'Segoe UI' });
  // Tabel 28 kombinasi (kompak, 2 kolom)
  const tableRows = rows.map((r) => [
    { text: r['Nomor Kombinasi jenis Prompt Engineering'], options: { fontSize: 8.5, color: C.primary, bold: true, fontFace: 'Segoe UI', align: 'center' } },
    { text: r['Deskripsi Kualitas Hasil'].replace(/^"+|"+$/g, ''), options: { fontSize: 8.5, color: C.text, fontFace: 'Segoe UI' } },
    { text: r['Jumlah Token Input'], options: { fontSize: 8.5, color: C.muted, fontFace: 'Segoe UI', align: 'center' } },
    { text: r['Jumlah Token Output'], options: { fontSize: 8.5, color: C.muted, fontFace: 'Segoe UI', align: 'center' } },
  ]);
  s.addTable(tableRows, {
    x: 0.6, y: 4.05, w: 8.8,
    colW: [0.8, 5.6, 1.2, 1.2],
    headerRow: false,
    border: { type: 'solid', color: 'E1E9F0', pt: 0.5 },
    rowH: 0.24,
    margin: [2, 3, 2, 3],
    autoPage: false,
  });
  s.addNotes(`Hasil eksperimen: 28 kombinasi teknik prompting diuji ke Atria Dawn Preview. Total ${totalIn.toLocaleString('id-ID')} token input, ${totalOut.toLocaleString('id-ID')} token output, ${(totalIn + totalOut).toLocaleString('id-ID')} token keseluruhan. Rata-rata ${Math.round(totalIn / rows.length)} token input dan ${Math.round(totalOut / rows.length)} token output per prompt. Tabel menampilkan nomor kombinasi, kualitas hasil, dan token per kombinasi. Data diambil dari prompt_results_final.csv.`);

  // ---------- Slide 7: Teknik Prompting ----------
  s = p.addSlide();
  s.background = { color: C.light };
  addHeader(s, 'Teknik Prompting yang Diuji', C);
  const techs = [
    ['Zero-shot', 'Memberi task tanpa contoh jawaban'],
    ['Persona/Role', 'Menetapkan peran: "Anda adalah koki..."'],
    ['Format', 'Meminta struktur: pendahuluan-isi-kesimpulan'],
    ['Action-oriented', 'Meminta langkah/aksi konkret'],
    ['Negative', 'Larangan: "Jangan bahas berat badan"'],
    ['Tool-based', 'Menyebut API/sumber data eksternal'],
    ['Chain of Thought', 'Berpikir langkah demi langkah'],
    ['Tree of Thought', 'Jelajahi beberapa jalur, evaluasi, rekomendasikan'],
  ];
  techs.forEach((t, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.6 + col * 4.55, y = 1.35 + row * 0.98;
    s.addShape('roundRect', { x, y, w: 4.3, h: 0.86, fill: { color: C.white }, line: { color: 'DCE5EE', width: 1 }, rectRadius: 0.06 });
    s.addShape('rect', { x, y, w: 0.07, h: 0.86, fill: { color: i % 2 ? C.accent2 : C.accent } });
    s.addText(t[0], { x: x + 0.2, y: y + 0.06, w: 4.0, h: 0.35, fontSize: 13, bold: true, color: C.primary, fontFace: 'Segoe UI' });
    s.addText(t[1], { x: x + 0.2, y: y + 0.4, w: 4.0, h: 0.4, fontSize: 10.5, color: C.muted, fontFace: 'Segoe UI' });
  });
  s.addNotes('Delapan teknik prompting yang dikombinasikan dalam eksperimen: Zero-shot, Persona/Role, Format, Action-oriented, Negative, Tool-based, Chain of Thought, dan Tree of Thought. Kombinasi teknik inilah yang menghasilkan 28 variasi prompt pada slide sebelumnya.');

  // ---------- Slide 8: Temuan ----------
  s = p.addSlide();
  s.background = { color: C.light };
  addHeader(s, 'Temuan & Insight', C);
  const findings = [
    ['Prompt sederhana = token input hemat', 'Task description + Zero-shot (kombinasi #1) hanya butuh 298 token input, output 1.036 token — paling efisien.'],
    ['Format terstruktur meningkatkan output', 'Meminta format pendahuluan-isi-kesimpulan menghasilkan jawaban lebih panjang dan terorganisir.'],
    ['Negative prompting efektif mengontrol cakupan', 'Larangan eksplisit ("jangan bahas berat badan") berhasil membatasi topik jawaban.'],
    ['Tree of Thought menghasilkan output terbanyak', 'Kombinasi 5 elemen penuh + ToT (kombinasi #6) menghasilkan 519 token output — analisis paling mendalam.'],
    ['Persona meningkatkan konsistensi gaya', 'Penetapan peran ("Anda adalah koki") membuat jawaban lebih konsisten dari segi nada dan sudut pandang.'],
  ];
  findings.forEach((f, i) => {
    const y = 1.35 + i * 0.92;
    s.addShape('roundRect', { x: 0.6, y, w: 8.8, h: 0.82, fill: { color: C.white }, line: { color: 'DCE5EE', width: 1 }, rectRadius: 0.06 });
    s.addText(String(i + 1), { x: 0.75, y: y + 0.14, w: 0.45, h: 0.45, fontSize: 16, bold: true, color: C.accent, align: 'center', fontFace: 'Segoe UI' });
    s.addText(f[0], { x: 1.3, y: y + 0.06, w: 8.0, h: 0.35, fontSize: 12.5, bold: true, color: C.primary, fontFace: 'Segoe UI' });
    s.addText(f[1], { x: 1.3, y: y + 0.4, w: 8.0, h: 0.38, fontSize: 10.5, color: C.muted, fontFace: 'Segoe UI' });
  });
  s.addNotes('Lima temuan utama. Pertama, prompt sederhana paling efisien: kombinasi #1 hanya 298 token input menghasilkan 1.036 token output. Kedua, format terstruktur meningkatkan panjang dan organisasi jawaban. Ketiga, negative prompting efektif membatasi cakupan topik. Keempat, Tree of Thought menghasilkan output terbanyak (519 token, kombinasi #6). Kelima, persona membuat gaya jawaban lebih konsisten.');

  // ---------- Slide 9: Stack & Struktur ----------
  s = p.addSlide();
  s.background = { color: C.light };
  addHeader(s, 'Teknologi & Struktur Project', C);
  const stack = [
    ['Backend', 'Node.js v24 (native http)', 'Tanpa framework — routing manual'],
    ['Database', 'MySQL 8 via XAMPP', 'mysql2/promise, connection pool'],
    ['Frontend', 'HTML/CSS/JS single-page', 'Tanpa build tool, localStorage'],
    ['AI Model', 'Atria-Dawn-Preview', 'Atria AI API, Bearer auth'],
    ['Eksperimen', 'csv-parser + csv-writer', 'Pipeline otomatis 28 kombinasi'],
  ];
  stack.forEach((st, i) => {
    const y = 1.35 + i * 0.88;
    s.addShape('roundRect', { x: 0.6, y, w: 8.8, h: 0.78, fill: { color: C.white }, line: { color: 'DCE5EE', width: 1 }, rectRadius: 0.06 });
    s.addText(st[0], { x: 0.8, y: y + 0.08, w: 1.7, h: 0.6, fontSize: 13, bold: true, color: C.accent, fontFace: 'Segoe UI', valign: 'middle' });
    s.addText(st[1], { x: 2.6, y: y + 0.06, w: 3.6, h: 0.66, fontSize: 12, color: C.primary, fontFace: 'Segoe UI', valign: 'middle' });
    s.addText(st[2], { x: 6.3, y: y + 0.06, w: 3.0, h: 0.66, fontSize: 10.5, italic: true, color: C.muted, fontFace: 'Segoe UI', valign: 'middle' });
  });
  s.addText('Struktur: server.js + index.html (core) · folder eksperimen/ (pipeline prompt engineering)', { x: 0.6, y: 5.9, w: 8.8, h: 0.35, fontSize: 11, italic: true, color: C.muted, fontFace: 'Segoe UI' });
  s.addNotes('Stack teknologi: Node.js v24 dengan native http tanpa framework, MySQL 8 via XAMPP dengan mysql2/promise, frontend single-page tanpa build tool, model Atria-Dawn-Preview via Atria AI API. Eksperimen menggunakan csv-parser dan csv-writer untuk pipeline otomatis 28 kombinasi. Struktur project: server.js dan index.html sebagai core, folder eksperimen/ berisi pipeline prompt engineering.');

  // ---------- Slide 10: Penutup ----------
  s = p.addSlide();
  s.background = { color: C.primary };
  s.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.15, fill: { color: C.accent } });
  s.addText('Terima Kasih', { x: 0.9, y: 1.8, w: 9, h: 0.9, fontSize: 40, bold: true, color: C.white, fontFace: 'Segoe UI' });
  s.addText('Dashboard Chatbot · Eksperimen Prompt Engineering', { x: 0.9, y: 2.8, w: 9, h: 0.5, fontSize: 18, color: C.accent, fontFace: 'Segoe UI' });
  s.addText('Server: http://localhost:3000 · 28 kombinasi · 17.998 token dianalisis', { x: 0.9, y: 3.5, w: 9, h: 0.4, fontSize: 13, color: 'B8C7D6', fontFace: 'Segoe UI' });
  s.addNotes('Penutup. Ringkas: dashboard chatbot dengan monitoring real-time dan eksperimen prompt engineering 28 kombinasi, 17.998 token dianalisis. Server berjalan di http://localhost:3000. Buka sesi tanya jawab.');

  p.writeFile({ fileName: 'Presentasi_ChatBot.pptx' })
    .then(() => console.log('OK: Presentasi_ChatBot.pptx dibuat, 10 slide'));
}

function addHeader(s, title, C) {
  s.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.85, fill: { color: C.primary } });
  s.addShape('rect', { x: 0, y: 0.85, w: '100%', h: 0.05, fill: { color: C.accent } });
  s.addText(title, { x: 0.6, y: 0.15, w: 9, h: 0.55, fontSize: 24, bold: true, color: C.white, fontFace: 'Segoe UI' });
}

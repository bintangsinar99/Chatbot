# Dashboard Chatbot

Dashboard monitoring dan manajemen chatbot dengan metrik real-time, live chat, dan konfigurasi model AI.

## Fitur

- **Overview**: 4 kartu metrik (percakapan, token, latency, error rate), chart aktivitas 7 hari, distribusi token
- **Live Chat**: Percakapan langsung dengan chatbot, tracking token per sesi
- **Request Log**: 20 request terakhir dengan status, latency, dan token
- **Settings**: Kelola model AI — pilih model aktif, tambah model custom, hapus model

## Cara Pakai

### Setup Awal

1. Buat file `.env` di folder project:
   ```
   NINE_API_KEY=atr_xxxxxxxxxxxxx
   ```

2. Jalankan server:
   ```powershell
   node server.js
   ```

3. Buka browser ke `http://localhost:3000`

### Menambah Model AI

1. Buka tab **Settings** di dashboard
2. Scroll ke panel "Tambah model baru"
3. Isi:
   - **Nama tampilan**: Nama yang muncul di dropdown (contoh: "GPT-4 Turbo")
   - **Model identifier**: ID model yang diterima API (contoh: "gpt-4-turbo-preview")
4. Klik "Tambah Model"
5. Model baru langsung muncul di dropdown "Pilih model"

### Mengganti Model Aktif

1. Buka tab **Settings**
2. Pilih model dari dropdown "Pilih model"
3. Percakapan baru di tab **Live Chat** akan pakai model yang dipilih

### Menghapus Model Custom

1. Buka tab **Settings**
2. Di panel "Model tersimpan", klik tombol **Hapus** di model yang ingin dihapus
3. Model default (Atria Dawn Preview) tidak bisa dihapus

### Konfigurasi API Endpoint dan Key

1. Buka tab **Settings**
2. Di panel **API Configuration**, isi:
   - **API Endpoint**: URL lengkap endpoint chat completions (contoh: `https://api.openai.com/v1/chat/completions`)
   - **API Key**: API key untuk endpoint tersebut (contoh: `sk-xxxxxxxxxxxxx`)
3. Klik "Simpan Konfigurasi"
4. Percakapan baru akan menggunakan endpoint dan key yang baru

**Catatan:**
- Endpoint dan API key disimpan di localStorage browser (tidak sync antar device)
- Jika tidak diisi, server fallback ke `.env` file
- Mendukung endpoint HTTP dan HTTPS

## Arsitektur

### Frontend (`index.html`)

- **localStorage** menyimpan:
  - Daftar model dan pilihan aktif
  - API endpoint dan API key custom
- Header dikirim ke server di setiap request chat:
  - `X-Model`: model identifier (default: `Atria-Dawn-Preview`)
  - `X-API-Endpoint`: URL endpoint custom (opsional)
  - `X-API-Key`: API key custom (opsional)

### Backend (`server.js`)

- Baca header dari request:
  - `X-Model` → model identifier, fallback ke `Atria-Dawn-Preview`
  - `X-API-Endpoint` → endpoint URL, fallback ke `https://api.atria-asi.ai/v1/chat/completions`
  - `X-API-Key` → API key, fallback ke `.env` file
- Fungsi `callAI(messages, model, endpoint, apiKey)` kirim request ke API dengan konfigurasi dinamis
- Mendukung HTTP dan HTTPS endpoint (otomatis detect dari protocol URL)
- Metrik in-memory (reset saat restart)

## Limitasi

- **Model disimpan di localStorage browser** — tidak sync antar device/browser
- **Server tidak validasi model identifier** — kalau ID salah, API akan error
- **Metrik in-memory** — restart server = semua angka kembali nol
- **STATS.sessions Set tumbuh unbounded** — untuk produksi, perlu TTL atau cap

## API Endpoints

### POST `/api/chat`

Request:
```json
{
  "messages": [{"role": "user", "content": "hai"}],
  "sessionId": "uuid"
}
```

Headers:
```
Content-Type: application/json
X-Model: Atria-Dawn-Preview
X-API-Endpoint: https://api.atria-asi.ai/v1/chat/completions (opsional)
X-API-Key: atr_xxxxxxxxxxxxx (opsional)
```

**Behavior:**
- Jika `X-API-Endpoint` dan `X-API-Key` dikirim, server gunakan itu
- Jika tidak ada, server fallback ke `.env` file (`NINE_API_KEY`)
- Endpoint default: `https://api.atria-asi.ai/v1/chat/completions`

Response:
```json
{
  "reply": "Halo! Ada yang bisa saya bantu?",
  "stats": { "inTok": 37, "outTok": 34, "ms": 4561 }
}
```

### GET `/api/stats`

Response:
```json
{
  "uptimeMs": 123456,
  "sessions": 5,
  "requests": 42,
  "errors": 1,
  "errorRate": 0.024,
  "avgLatencyMs": 4832,
  "maxLatencyMs": 6102,
  "tokensIn": 1250,
  "tokensOut": 890,
  "totalTokens": 2140,
  "days": [{"date": "2026-10-07", "requests": 42, "errors": 1, "tokens": 2140}],
  "recent": [{"at": "2026-10-07T10:30:00.000Z", "ms": 4561, "tokens": 71, "ok": true}]
}
```

## Tech Stack

- **Runtime**: Node.js (built-in `http`, `https`, `fs`, `path` — zero dependencies)
- **API**: Atria AI (`https://api.atria-asi.ai/v1/chat/completions`)
- **Frontend**: Vanilla JS, CSS custom properties, localStorage
- **Security**: Path traversal protection, 1MB body limit, input validation

## Lisensi

MIT

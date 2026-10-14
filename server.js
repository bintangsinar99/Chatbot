const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Database connection pool
const pool = mysql.createPool({
    host: '127.0.0.1',
    port: 3308,
    user: 'root',
    password: '',
    database: 'chatbot_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test koneksi dan buat database/tabel jika belum ada
(async () => {
    try {
        const conn = await mysql.createConnection({
            host: '127.0.0.1',
            port: 3308,
            user: 'root',
            password: ''
        });
        
        await conn.query('CREATE DATABASE IF NOT EXISTS chatbot_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        await conn.query('USE chatbot_db');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS chat_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id VARCHAR(64) NOT NULL,
                role ENUM('user', 'assistant', 'system') NOT NULL,
                content TEXT NOT NULL,
                tokens_in INT DEFAULT 0,
                tokens_out INT DEFAULT 0,
                latency_ms INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_session (session_id),
                INDEX idx_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await conn.end();
        console.log('✓ Database dan tabel siap');
    } catch (err) {
        console.error('Database setup error:', err.message);
        process.exit(1);
    }
})();

const PORT = 3000;
const MAX_BODY = 1_000_000; // 1 MB: payload chat jauh di bawah ini

let API_KEY = '';
try {
    const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    API_KEY = envFile.match(/^NINE_API_KEY=(.+)$/m)?.[1]?.trim() || '';
} catch {
    console.error('ERROR: File .env tidak ditemukan. Buat file .env berisi NINE_API_KEY=...');
    process.exit(1);
}
if (!API_KEY || API_KEY === 'sk-MASUKKAN_API_KEY_DISINI') {
    console.error('ERROR: Isi API key di file .env dulu!');
    process.exit(1);
}

const SYSTEM_MSG = { role: 'system', content:
    'Kamu adalah asisten AI yang ahli, ramah, dan ringkas. Jawab dalam Bahasa Indonesia.\n\n' +
    '## Persona & Batasan\n' +
    '- Berperan sebagai asisten yang kompeten dan to-the-point.\n' +
    '- Hanya jawab berdasarkan pengetahuan yang kamu yakini benar.\n' +
    '- Jika tidak tahu, katakan tidak tahu. Jangan mengarang.\n\n' +
    '## Chain of Thought\n' +
    '- Untuk pertanyaan kompleks atau analitis, pikirkan langkah demi langkah sebelum menjawab.\n' +
    '- Untuk pertanyaan sederhana, jawab langsung tanpa penjelasan bertele-tele.\n\n' +
    '## Larangan (Negative Prompting)\n' +
    '- JANGAN mengarang fakta, data, atau sumber yang tidak ada.\n' +
    '- JANGAN mengulang pertanyaan user di awal jawaban.\n' +
    '- JANGAN gunakan basa-basi berlebihan atau filler seperti "Tentu!", "Baik!", "Dengan senang hati!".\n' +
    '- JANGAN memberikan informasi medis, hukum, atau keuangan sebagai pengganti profesional.'
};

// Metrik in-memory. Reset tiap restart server, tidak persisten.
// Ceiling yang diketahui: STATS.sessions tumbuh per id unik tanpa eviction.
// Kalau nanti dipakai publik, tambahkan TTL atau batas ukuran Set.
const STATS = {
    startedAt: Date.now(),
    sessions: new Set(),
    requests: 0,
    errors: 0,
    latencySumMs: 0,
    latencyMaxMs: 0,
    tokensIn: 0,
    tokensOut: 0,
    days: {},
    recent: []
};

const todayKey = () => new Date().toISOString().slice(0, 10);

function dayBucket(key = todayKey()) {
    if (!STATS.days[key]) STATS.days[key] = { requests: 0, errors: 0, tokens: 0 };
    return STATS.days[key];
}

// API ini tidak selalu mengirim usage; estimasi kasar ~4 karakter per token.
const estimateTokens = (text) => Math.ceil((text || '').length / 4);

// Simpan pesan ke database
async function saveMessage(sessionId, role, content, tokensIn = 0, tokensOut = 0, latencyMs = 0) {
    try {
        await pool.query(
            'INSERT INTO chat_history (session_id, role, content, tokens_in, tokens_out, latency_ms) VALUES (?, ?, ?, ?, ?, ?)',
            [sessionId, role, content, tokensIn, tokensOut, latencyMs]
        );
    } catch (err) {
        console.error('Save message error:', err.message);
    }
}

// Load history untuk session tertentu (maksimal 50 pesan terakhir)
async function loadHistory(sessionId, limit = 50) {
    try {
        const [rows] = await pool.query(
            'SELECT role, content, created_at FROM chat_history WHERE session_id = ? ORDER BY created_at DESC LIMIT ?',
            [sessionId, limit]
        );
        return rows.reverse().map(r => ({ role: r.role, content: r.content }));
    } catch (err) {
        console.error('Load history error:', err.message);
        return [];
    }
}

function callAI(messages) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            model: 'Atria-Dawn-Preview',
            messages: [SYSTEM_MSG, ...messages]
        });

        const options = {
            hostname: 'api.atria-asi.ai',
            port: 443,
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.error) {
                        console.error('API Error Response:', json.error);
                        reject(new Error(json.error.message || JSON.stringify(json.error)));
                        return;
                    }
                    if (json.choices?.[0]?.message?.content) {
                        resolve({
                            content: json.choices[0].message.content,
                            usage: json.usage || null
                        });
                    } else {
                        console.error('API Response JSON:', json);
                        const msg = json.message || 'API response missing choices[0].message.content';
                        reject(new Error(msg));
                    }
                } catch (parseErr) {
                    console.error('Raw API Response:', data.substring(0, 500));
                    console.error('Status Code:', res.statusCode);
                    const preview = data.length > 100 ? data.substring(0, 100) + '...' : data;
                    reject(new Error(`Failed to parse API response (HTTP ${res.statusCode}): ${preview}`));
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(120000, () => { req.destroy(); reject(new Error('Request timeout')); });
        req.write(payload);
        req.end();
    });
}

const server = http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/api/chat') {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > MAX_BODY) {
                res.writeHead(413, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Payload terlalu besar' }));
                req.destroy();
            }
        });
        req.on('end', async () => {
            const started = Date.now();
            STATS.requests++;
            const bucket = dayBucket();
            bucket.requests++;

            try {
                const { messages, sessionId } = JSON.parse(body);
                if (!Array.isArray(messages) || messages.length === 0) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'messages required' }));
                }
                const sid = sessionId ? String(sessionId).slice(0, 64) : 'anonymous';
                if (sessionId) STATS.sessions.add(sid);

                // Simpan pesan user ke database
                const userMsg = messages[messages.length - 1];
                if (userMsg && userMsg.role === 'user') {
                    await saveMessage(sid, 'user', userMsg.content);
                }

                const { content, usage } = await callAI(messages);
                const elapsed = Date.now() - started;
                const inTok = usage?.prompt_tokens ?? estimateTokens(messages.map(m => m.content).join(''));
                const outTok = usage?.completion_tokens ?? estimateTokens(content);

                // Simpan reply assistant ke database
                await saveMessage(sid, 'assistant', content, inTok, outTok, elapsed);

                STATS.latencySumMs += elapsed;
                STATS.latencyMaxMs = Math.max(STATS.latencyMaxMs, elapsed);
                STATS.tokensIn += inTok;
                STATS.tokensOut += outTok;
                bucket.tokens += inTok + outTok;
                STATS.recent.unshift({ at: new Date().toISOString(), ms: elapsed, tokens: inTok + outTok, ok: true });
                STATS.recent = STATS.recent.slice(0, 20);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ reply: content, stats: { inTok, outTok, ms: elapsed } }));
            } catch (err) {
                STATS.errors++;
                bucket.errors++;
                STATS.recent.unshift({ at: new Date().toISOString(), ms: Date.now() - started, tokens: 0, ok: false });
                STATS.recent = STATS.recent.slice(0, 20);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ reply: 'Maaf, terjadi error: ' + err.message }));
            }
        });
        return;
    }

    if (req.method === 'GET' && req.url === '/api/stats') {
        const successful = STATS.requests - STATS.errors;
        const avgMs = successful > 0 ? Math.round(STATS.latencySumMs / successful) : 0;
        const days = Object.entries(STATS.days)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-7)
            .map(([date, v]) => ({ date, ...v }));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
            uptimeMs: Date.now() - STATS.startedAt,
            sessions: STATS.sessions.size,
            requests: STATS.requests,
            errors: STATS.errors,
            errorRate: STATS.requests ? +(STATS.errors / STATS.requests).toFixed(3) : 0,
            avgLatencyMs: avgMs,
            maxLatencyMs: STATS.latencyMaxMs,
            tokensIn: STATS.tokensIn,
            tokensOut: STATS.tokensOut,
            totalTokens: STATS.tokensIn + STATS.tokensOut,
            days,
            recent: STATS.recent
        }));
    }

    if (req.method === 'GET' && req.url.startsWith('/api/history?')) {
        const params = new URLSearchParams(req.url.split('?')[1]);
        const sessionId = params.get('sessionId');
        if (!sessionId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'sessionId required' }));
        }
        const history = await loadHistory(sessionId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ history }));
    }

    if (req.method === 'GET' && req.url === '/api/sessions') {
        try {
            const [rows] = await pool.query(`
                SELECT 
                    session_id,
                    MIN(created_at) as first_message,
                    MAX(created_at) as last_message,
                    COUNT(*) as message_count
                FROM chat_history
                GROUP BY session_id
                ORDER BY last_message DESC
                LIMIT 20
            `);
            const sessions = await Promise.all(rows.map(async (row) => {
                const [firstMsg] = await pool.query(
                    'SELECT content FROM chat_history WHERE session_id = ? ORDER BY created_at ASC LIMIT 1',
                    [row.session_id]
                );
                const title = firstMsg[0]?.content.substring(0, 50) || 'Chat baru';
                const preview = firstMsg[0]?.content.substring(0, 60) || '';
                return {
                    session_id: row.session_id,
                    title,
                    preview,
                    last_message: row.last_message,
                    message_count: row.message_count
                };
            }));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ sessions }));
        } catch (err) {
            console.error('Load sessions error:', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: err.message }));
        }
    }

    // Static file: resolve dulu, lalu pastikan hasilnya tetap di dalam ROOT.
    // Tanpa cek ini, /../../Windows/System32/config/SAM bisa dibaca.
    let pathname;
    try {
        pathname = decodeURIComponent(req.url.split('?')[0]);
    } catch {
        res.writeHead(400);
        return res.end('Bad request');
    }
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filePath = path.resolve(__dirname, relative);
    if (filePath !== __dirname && !filePath.startsWith(__dirname + path.sep)) {
        res.writeHead(403);
        return res.end('Forbidden');
    }

    const ext = path.extname(filePath);
    const types = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.ico': 'image/x-icon'
    };

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            return res.end('Not found');
        }
        res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
        res.end(data);
    });
});

server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));

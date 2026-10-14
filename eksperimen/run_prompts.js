const fs = require('fs');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

// Konfigurasi
const API_URL = 'http://localhost:3000/api/chat';
const CSV_INPUT = 'prompt_short_indonesia.csv';
const CSV_OUTPUT = 'prompt_results.csv';
const DELAY_BETWEEN_PROMPTS = 2000; // 2 detik delay antara prompt
const TIMEOUT_MS = 120000; // 120 detik

// Simpan hasil ke CSV (dipanggil incremental + di akhir)
async function saveResults(results) {
    const csvWriter = createObjectCsvWriter({
        path: CSV_OUTPUT,
        header: [
            { id: 'prompt', title: 'Prompt' },
            { id: 'nomor', title: 'Nomor Kombinasi jenis Prompt Engineering' },
            { id: 'tokensIn', title: 'Jumlah Token Input' },
            { id: 'tokensOut', title: 'Jumlah Token Output' },
            { id: 'deskripsi', title: 'Deskripsi Kualitas Hasil' },
            { id: 'sessionId', title: 'Session ID' },
            { id: 'duration', title: 'Duration (ms)' },
            { id: 'reply', title: 'Preview Respons' }
        ]
    });
    await csvWriter.writeRecords(results);
}

// Baca CSV dan jalankan semua prompt
async function runAllPrompts() {
    const prompts = [];
    
    // Baca CSV input
    await new Promise((resolve, reject) => {
        fs.createReadStream(CSV_INPUT)
            .pipe(csv())
            .on('data', (row) => {
                prompts.push({
                    prompt: row.Prompt,
                    nomor: row['Nomor Kombinasi jenis Prompt Engineering'],
                    deskripsi: row['Deskripsi Kualitas Hasil']
                });
            })
            .on('end', resolve)
            .on('error', reject);
    });

    console.log(`\n📋 Ditemukan ${prompts.length} prompt\n`);

    const results = [];

    // Jalankan setiap prompt dengan session baru
    for (let i = 0; i < prompts.length; i++) {
        const { prompt, nomor, deskripsi } = prompts[i];
        
        // Generate session ID baru untuk setiap prompt (simulasi New Chat)
        const sessionId = `auto-${Date.now()}-${i}`;
        
        console.log(`\n[${i + 1}/${prompts.length}] Menjalankan prompt #${nomor}...`);
        console.log(`Session: ${sessionId}`);
        console.log(`Prompt: ${prompt.substring(0, 80)}...\n`);

        try {
            const startTime = Date.now();
            
            // Fetch dengan timeout 60 detik
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);
            
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: prompt }],
                    sessionId: sessionId
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            const data = await response.json();
            const duration = Date.now() - startTime;

            if (data.error) {
                throw new Error(data.error);
            }

            const tokensIn = data.stats?.inTok || 0;
            const tokensOut = data.stats?.outTok || 0;
            const totalTokens = tokensIn + tokensOut;

            console.log(`✅ Selesai dalam ${(duration / 1000).toFixed(1)}s`);
            console.log(`   Token Input: ${tokensIn}`);
            console.log(`   Token Output: ${tokensOut}`);
            console.log(`   Total: ${totalTokens} token`);

            results.push({
                prompt: prompt,
                nomor: nomor,
                tokensIn: tokensIn,
                tokensOut: tokensOut,
                deskripsi: deskripsi,
                sessionId: sessionId,
                duration: duration,
                reply: data.reply.substring(0, 200) + '...' // Preview respons
            });

            // Simpan hasil sementara setiap sukses (anti kehilangan data)
            await saveResults(results);

        } catch (error) {
            console.error(`❌ Error: ${error.message}`);
            results.push({
                prompt: prompt,
                nomor: nomor,
                tokensIn: 0,
                tokensOut: 0,
                deskripsi: deskripsi + ' [ERROR]',
                sessionId: sessionId,
                duration: 0,
                reply: `Error: ${error.message}`
            });

            // Simpan hasil sementara meski error
            await saveResults(results);

        }

        // Delay sebelum prompt berikutnya
        if (i < prompts.length - 1) {
            console.log(`⏳ Menunggu ${DELAY_BETWEEN_PROMPTS / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_PROMPTS));
        }
    }

    // Tulis hasil ke CSV baru
    console.log(`\n\n💾 Menyimpan hasil ke ${CSV_OUTPUT}...`);
    
    // Tulis hasil ke CSV (final save)
    await saveResults(results);

    // Statistik akhir
    console.log(`\n\n📊 RINGKASAN HASIL:\n`);
    console.log(`Total prompt dijalankan: ${results.length}`);
    console.log(`Total token input: ${results.reduce((sum, r) => sum + r.tokensIn, 0)}`);
    console.log(`Total token output: ${results.reduce((sum, r) => sum + r.tokensOut, 0)}`);
    console.log(`Total waktu: ${(results.reduce((sum, r) => sum + r.duration, 0) / 1000).toFixed(1)}s`);
    console.log(`\nHasil tersimpan di: ${CSV_OUTPUT}\n`);
}

// Jalankan
runAllPrompts().catch(console.error);

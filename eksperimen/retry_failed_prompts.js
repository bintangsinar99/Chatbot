const fs = require('fs');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

// Konfigurasi
const API_URL = 'http://localhost:3000/api/chat';
const CSV_INPUT = 'prompt_results.csv';
const CSV_OUTPUT = 'prompt_results_final.csv';
const DELAY_BETWEEN_PROMPTS = 2000;
const TIMEOUT_MS = 180000; // 180 detik untuk prompt yang kompleks

async function retryFailedPrompts() {
    const allResults = [];
    const failedPrompts = [];
    
    // Baca CSV hasil pertama
    await new Promise((resolve, reject) => {
        fs.createReadStream(CSV_INPUT)
            .pipe(csv())
            .on('data', (row) => {
                allResults.push(row);
                // Cek jika token input = 0 (error)
                if (parseInt(row['Jumlah Token Input']) === 0) {
                    failedPrompts.push(row);
                }
            })
            .on('end', resolve)
            .on('error', reject);
    });

    console.log(`\n📋 Ditemukan ${failedPrompts.length} prompt yang error\n`);

    // Retry setiap prompt yang gagal
    for (let i = 0; i < failedPrompts.length; i++) {
        const item = failedPrompts[i];
        const prompt = item.Prompt;
        const nomor = item['Nomor Kombinasi jenis Prompt Engineering'];
        const deskripsi = item['Deskripsi Kualitas Hasil'];
        
        // Generate session ID baru
        const sessionId = `retry-${Date.now()}-${i}`;
        
        console.log(`\n[${i + 1}/${failedPrompts.length}] Retry prompt #${nomor}...`);
        console.log(`Session: ${sessionId}`);
        console.log(`Prompt: ${prompt.substring(0, 80)}...\n`);

        try {
            const startTime = Date.now();
            
            // Fetch dengan timeout 120 detik
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
            
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

            console.log(`✅ Selesai dalam ${(duration / 1000).toFixed(1)}s`);
            console.log(`   Token Input: ${tokensIn}`);
            console.log(`   Token Output: ${tokensOut}`);
            console.log(`   Total: ${tokensIn + tokensOut} token`);

            // Update hasil di array
            const index = allResults.findIndex(r => r.Prompt === prompt && r['Nomor Kombinasi jenis Prompt Engineering'] === nomor);
            if (index !== -1) {
                allResults[index]['Jumlah Token Input'] = tokensIn;
                allResults[index]['Jumlah Token Output'] = tokensOut;
                allResults[index]['Session ID'] = sessionId;
                allResults[index]['Duration (ms)'] = duration;
                allResults[index]['Preview Respons'] = data.reply.substring(0, 200) + '...';
                allResults[index]['Deskripsi Kualitas Hasil'] = deskripsi.replace(' [ERROR]', '');
            }

        } catch (error) {
            console.error(`❌ Masih error: ${error.message}`);
            // Tetap tandai sebagai error
        }

        // Delay sebelum prompt berikutnya
        if (i < failedPrompts.length - 1) {
            console.log(`⏳ Menunggu ${DELAY_BETWEEN_PROMPTS / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_PROMPTS));
        }
    }

    // Tulis hasil final ke CSV baru
    console.log(`\n\n💾 Menyimpan hasil final ke ${CSV_OUTPUT}...`);
    
    const csvWriter = createObjectCsvWriter({
        path: CSV_OUTPUT,
        header: [
            { id: 'Prompt', title: 'Prompt' },
            { id: 'Nomor Kombinasi jenis Prompt Engineering', title: 'Nomor Kombinasi jenis Prompt Engineering' },
            { id: 'Jumlah Token Input', title: 'Jumlah Token Input' },
            { id: 'Jumlah Token Output', title: 'Jumlah Token Output' },
            { id: 'Deskripsi Kualitas Hasil', title: 'Deskripsi Kualitas Hasil' },
            { id: 'Session ID', title: 'Session ID' },
            { id: 'Duration (ms)', title: 'Duration (ms)' },
            { id: 'Preview Respons', title: 'Preview Respons' }
        ]
    });

    await csvWriter.writeRecords(allResults);

    // Statistik akhir
    const successCount = allResults.filter(r => parseInt(r['Jumlah Token Input']) > 0).length;
    const errorCount = allResults.filter(r => parseInt(r['Jumlah Token Input']) === 0).length;
    const totalTokensIn = allResults.reduce((sum, r) => sum + parseInt(r['Jumlah Token Input'] || 0), 0);
    const totalTokensOut = allResults.reduce((sum, r) => sum + parseInt(r['Jumlah Token Output'] || 0), 0);

    console.log(`\n\n📊 RINGKASAN FINAL:\n`);
    console.log(`Total prompt: ${allResults.length}`);
    console.log(`✅ Sukses: ${successCount}`);
    console.log(`❌ Masih error: ${errorCount}`);
    console.log(`Total token input: ${totalTokensIn}`);
    console.log(`Total token output: ${totalTokensOut}`);
    console.log(`Total token: ${totalTokensIn + totalTokensOut}`);
    console.log(`\nHasil tersimpan di: ${CSV_OUTPUT}\n`);
}

// Jalankan
retryFailedPrompts().catch(console.error);

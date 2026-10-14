const fs = require('fs');
const csv = require('csv-parser');

const IN = 'prompt_engineering_indonesia.csv';
const OUT = 'prompt_short_indonesia.csv';

const rows = [];
fs.createReadStream(IN)
  .pipe(csv())
  .on('data', (r) => rows.push(r))
  .on('end', () => {
    // Tambahkan instruksi "jawaban pendek" ke setiap prompt
    const SHORT = ' Jawab singkat, maksimal 3 kalimat.';

    const header = 'Prompt,Nomor Kombinasi jenis Prompt Engineering,Jumlah Token Input,Jumlah Token Output,Deskripsi Kualitas Hasil\n';
    const lines = rows.map(r => {
      let p = (r.Prompt || '').trim();
      // Jika prompt di-quote aslinya, tetap quote setelah modifikasi
      p = p + SHORT;
      const q = `"${p.replace(/"/g, '""')}"`;
      const nomor = r['Nomor Kombinasi jenis Prompt Engineering'] || '';
      const desk = `"${(r['Deskripsi Kualitas Hasil'] || '').replace(/"/g, '""')}"`;
      return `${q},${nomor},,,"${desk}"`;
    });
    fs.writeFileSync(OUT, header + lines.join('\n'), 'utf8');
    console.log(`✅ ${rows.length} prompt ditulis ke ${OUT}`);
    console.log('Contoh prompt pertama:');
    console.log('  ' + (rows[0].Prompt + SHORT));
  });

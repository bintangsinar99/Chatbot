const fs = require('fs');
const csv = require('csv-parser');

// Buat TSV (tab-separated) untuk paste ke Google Sheets
const rows = [];
fs.createReadStream('prompt_results_final.csv')
  .pipe(csv())
  .on('data', r => rows.push(r))
  .on('end', () => {
    const cols = ['Prompt', 'Nomor Kombinasi jenis Prompt Engineering', 'Jumlah Token Input', 'Jumlah Token Output', 'Deskripsi Kualitas Hasil'];
    const tsv = rows.map(r => cols.map(c => String(r[c] ?? '').replace(/\t/g, ' ').replace(/\n/g, ' ')).join('\t')).join('\n');
    fs.writeFileSync('paste_data.tsv', tsv);
    console.log('paste_data.tsv dibuat,', rows.length, 'baris');
    console.log('Preview baris 1:', tsv.split('\n')[0].slice(0, 100));
  });

const fs = require('fs');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

const rows = [];
fs.createReadStream('prompt_results_final.csv')
  .pipe(csv())
  .on('data', r => rows.push(r))
  .on('end', () => {
    const out = rows.map(r => ({
      'Prompt': r['Prompt'],
      'Nomor Kombinasi jenis Prompt Engineering': r['Nomor Kombinasi jenis Prompt Engineering'],
      'Jumlah Token Input': r['Jumlah Token Input'],
      'Jumlah Token Output': r['Jumlah Token Output'],
      'Deskripsi Kualitas Hasil': r['Deskripsi Kualitas Hasil'],
    }));
    const w = createObjectCsvWriter({
      path: 'template_upload.csv',
      header: Object.keys(out[0]).map(k => ({ id: k, title: k })),
    });
    w.writeRecords(out).then(() => console.log('template_upload.csv dibuat,', out.length, 'baris'));
  });

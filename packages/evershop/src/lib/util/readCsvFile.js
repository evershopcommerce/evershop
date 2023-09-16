const fs = require('fs');
const csv = require('csv-parser');

async function readCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = {};
    fs.createReadStream(filePath)
      .pipe(csv({ headers: false }))
      .on('data', (data) => {
        // Skip the first row (headers)
        if (!data[0].startsWith('#')) {
          // eslint-disable-next-line prefer-destructuring
          results[data[0]] = data[1];
        }
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

module.exports.readCsvFile = readCsvFile;

const fs = require('fs');
const csv = require('csv-parser');
const { getConfig } = require('../../util/getConfig');
const path = require('path');
const { CONSTANTS } = require('../../helpers');

async function readCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = {};
    fs.createReadStream(filePath)
      .pipe(csv({ headers: false }))
      .on('data', (data) => {
        // Skip the first row (headers)
        if (!data[0].startsWith('#')) {
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

module.exports.loadCsvTranslationFiles =
  async function loadCsvTranslationFiles() {
    try {
      const language = getConfig('shop.language', 'en');
      const folderPath = path.resolve(
        CONSTANTS.ROOTPATH,
        'translations',
        language
      );

      // Check if path exists
      if (!fs.existsSync(folderPath)) {
        return [];
      }

      const results = {};

      const files = await fs.promises.readdir(folderPath);
      const csvFiles = files.filter((file) => path.extname(file) === '.csv');
      const filePromises = csvFiles.map((file) => {
        const filePath = path.join(folderPath, file);
        return readCsvFile(filePath);
      });

      const fileDataList = await Promise.all(filePromises);
      for (const fileData of fileDataList) {
        for (const [key, value] of Object.entries(fileData)) {
          results[key] = value;
        }
      }

      return results;
    } catch (err) {
      console.error(err);
    }
  };

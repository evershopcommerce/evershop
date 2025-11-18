import fs, { PathLike } from 'fs';
import csv from 'csv-parser';

export async function readCsvFile<T>(
  filePath: PathLike | string
): Promise<Record<string, T>> {
  return new Promise((resolve, reject) => {
    const results: Record<string, T> = {};
    fs.createReadStream(filePath)
      .pipe(csv({ headers: false }))
      .on('data', (data) => {
        // Skip the first row (headers)
        if (!data[0].startsWith('#')) {
          results[data[0]] = data[1] as T;
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

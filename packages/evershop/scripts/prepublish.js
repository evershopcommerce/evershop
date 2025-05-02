import fs from 'fs';
import path from 'path';

fs.copyFile(
  path.resolve(__dirname, '../../README.md'),
  path.resolve(__dirname, './README.md'),
  (err) => {
    if (err) throw err;
  }
);

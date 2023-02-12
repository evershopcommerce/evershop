const fs = require('fs');
const path = require('path');

fs.copyFile(
  path.resolve(__dirname, '../../README.md'),
  path.resolve(__dirname, './README.md'),
  (err) => {
    if (err) throw err;
  }
);

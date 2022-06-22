const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.resolve(__dirname, './bin/serve/index.js'), { encoding: 'utf8', flag: 'r' });

const result = source.replace(/\.\.\/src/g, '../dist');

fs.writeFile(path.resolve(__dirname, './bin/serve/index.js'), result, 'utf8', (err) => {
  if (err) return console.log(err);
});

fs.copyFile(path.resolve(__dirname, '../../README.md'), path.resolve(__dirname, './README.md'), (err) => {
  if (err) throw err;
});

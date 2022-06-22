const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.resolve(__dirname, './bin/serve/index.js'), { encoding: 'utf8', flag: 'r' });

const result = source.replace(/\.\.\/dist/g, '../src');

fs.writeFile(path.resolve(__dirname, './bin/serve/index.js'), result, 'utf8', (err) => {
  // eslint-disable-next-line no-console
  if (err) { console.log(err); }
});

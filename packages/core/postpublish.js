const fs = require('fs');

const source = fs.readFileSync('./bin/serve/index.js', { encoding: 'utf8', flag: 'r' });

const result = source.replace(/\.\.\/dist/g, '../src');

fs.writeFile('./bin/serve/index.js', result, 'utf8', (err) => {
  if (err) return console.log(err);
});

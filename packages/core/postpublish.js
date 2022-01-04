var fs = require('fs')

const source = fs.readFileSync('./bin/serve/index.js', { encoding: 'utf8', flag: 'r' });

var result = source.replace(/\.\.\/dist/g, '../src');

fs.writeFile('./bin/serve/index.js', result, 'utf8', function (err) {
    if (err) return console.log(err);
});
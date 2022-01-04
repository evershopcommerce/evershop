var fs = require('fs')

const source = fs.readFileSync('./bin/serve/index.js', { encoding: 'utf8', flag: 'r' });

var result = source.replace(/\.\.\/src/g, '../dist');

fs.writeFile('./bin/serve/index.js', result, 'utf8', function (err) {
    if (err) return console.log(err);
});

fs.copyFile('../../README.md', './README.md', (err) => {
    if (err) throw err;
});
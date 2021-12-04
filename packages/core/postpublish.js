var fs = require('fs')

//fs.renameSync("./bin/dev/index.js", "./bin/dev/index_bk.js");

const source = fs.readFileSync('./bin/dev/index.js', { encoding: 'utf8', flag: 'r' });

var result = source.replace(/\.\.\/dist/g, '../src');

fs.writeFile('./bin/dev/index.js', result, 'utf8', function (err) {
    if (err) return console.log(err);
});
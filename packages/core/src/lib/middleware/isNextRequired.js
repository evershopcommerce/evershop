const { readFileSync } = require('fs');

module.exports = function isNextRequired(path) {
  const code = readFileSync(path, 'utf8');
  const test = code.includes('next');
  //console.log(path, test);
  return code.includes('next');
}
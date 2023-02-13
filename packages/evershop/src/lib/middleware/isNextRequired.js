const { readFileSync } = require('fs');

module.exports = function isNextRequired(path) {
  const code = readFileSync(path, 'utf8');
  return code.includes('next');
};

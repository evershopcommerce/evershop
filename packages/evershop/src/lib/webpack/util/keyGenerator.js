const crypto = require('crypto');

function generateComponentKey(text) {
  return crypto.createHash('md5').update(text).digest('hex');
}

module.exports = exports = {
  generateComponentKey
};

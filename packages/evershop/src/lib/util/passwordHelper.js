const bcrypt = require('bcryptjs');

module.exports.hashPassword = function hashPassword(password) {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  return hash;
};

module.exports.comparePassword = function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
};

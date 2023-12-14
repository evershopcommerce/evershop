const bcrypt = require('bcryptjs');
const { getValueSync } = require('./registry');

module.exports.hashPassword = function hashPassword(password) {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  return hash;
};

module.exports.comparePassword = function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
};

module.exports.verifyPassword = function verifyPassword(password) {
  const rules = getValueSync(
    'passwordVerifyRules',
    [
      {
        callback: (password) => password.length >= 6,
        message: 'Password must be at least 6 characters'
      }
    ],
    {},
    (rules) => {
      // rules must be an array
      if (!Array.isArray(rules)) {
        return false;
      }
      try {
        // Each rule must be an object with callback and message
        rules.forEach((rule) => {
          if (typeof rule !== 'object') {
            throw new Error('Rule must be an object');
          }
          if (typeof rule.callback !== 'function') {
            throw new Error('Rule callback must be a function');
          }
          if (typeof rule.message !== 'string') {
            throw new Error('Rule message must be a string');
          }
        });
        return true;
      } catch (e) {
        return false;
      }
    }
  );

  const errors = [];
  rules.forEach((rule) => {
    if (!rule.callback(password)) {
      errors.push(rule.message);
    }
  });

  if (errors.length) {
    throw new Error(`Password is invalid: ${errors.join(', ')}`);
  }
};

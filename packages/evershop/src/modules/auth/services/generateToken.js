const jwt = require('jsonwebtoken');
const { getTokenLifeTime } = require('./getTokenLifeTime');

module.exports.generateToken = (payload, secret, options = {}, cb) => {
  const { expiresIn = getTokenLifeTime() } = options;
  const token = jwt.sign(payload, secret, { expiresIn });
  if (cb) {
    cb(token);
  } else {
    return token;
  }
};

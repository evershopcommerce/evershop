const jwt = require('jsonwebtoken');
const { getTokenLifeTime } = require('./getTokenLifeTime');
const { getTokenSecret } = require('./getTokenSecret');

module.exports.generateToken = (payload, options = {}, cb) => {
  const { expiresIn = getTokenLifeTime(), secret = getTokenSecret() } = options;
  const token = jwt.sign(payload, secret, { expiresIn });
  if (cb) {
    cb(token);
  } else {
    return token;
  }
}
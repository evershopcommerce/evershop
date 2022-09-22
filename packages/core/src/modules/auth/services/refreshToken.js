const jwt = require('jsonwebtoken');
const { getTokenLifeTime } = require('./getTokenLifeTime');
const { getTokenSecret } = require('./getTokenSecret');

module.exports.refreshToken = function refreshToken(token, refreshOptions = {}, cb) {
  const payload = jwt.verify(token, getTokenSecret(), refreshOptions.verify);
  delete payload.iat;
  delete payload.exp;
  delete payload.nbf;
  delete payload.jti; //We are generating a new token, if you are using jwtid during signing, pass it in refreshOptions
  const jwtSignOptions = Object.assign({}, { expiresIn: getTokenLifeTime() }, { jwtid: refreshOptions.jwtid });
  // The first signing converted all needed options into claims, they are already in the payload
  const newToken = jwt.sign(payload, getTokenSecret(), jwtSignOptions);
  if (cb) {
    cb(newToken);
  } else {
    return newToken;
  }
}

module.exports.signToken = (payload, options, cb) => {
  const secretKey = options.secretKey || getTokenSecret();
  delete payload.iat;
  delete payload.exp;
  delete payload.nbf;
  delete payload.jti; //We are generating a new token, if you are using jwtid during signing, pass it in refreshOptions
  const jwtSignOptions = Object.assign({}, { expiresIn: getTokenLifeTime() }, options);
  const newToken = jwt.sign(payload, secretKey, jwtSignOptions);
  if (cb) {
    cb(newToken);
  } else {
    return newToken;
  }
}
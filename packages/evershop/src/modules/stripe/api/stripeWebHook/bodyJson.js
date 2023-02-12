const bodyParser = require('body-parser');

module.exports = (request, response, delegate, next) => {
  bodyParser.raw({ type: '*/*' })(request, response, next);
};

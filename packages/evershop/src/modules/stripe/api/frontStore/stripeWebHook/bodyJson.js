const bodyParser = require('body-parser');

module.exports = (request, response, stack, next) => {
  bodyParser.raw({ type: '*/*' })(request, response, next);
};

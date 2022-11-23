const bodyParser = require('body-parser');

module.exports = (request, response, stack, next) => {
  bodyParser.json()(request, response, next);
};

const bodyParser = require('body-parser');

module.exports = (request, response, deledate, next) => {
  bodyParser.json({ inflate: false })(request, response, next);
}
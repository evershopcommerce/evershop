const bodyParser = require('body-parser');

module.exports = (request, response, stack, next) => {
  bodyParser.json({ inflate: false })(request, response, () => {
    bodyParser.urlencoded({ extended: true })(request, response, next);
  });
};

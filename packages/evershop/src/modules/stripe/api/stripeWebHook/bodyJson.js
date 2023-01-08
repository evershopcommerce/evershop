const bodyParser = require('body-parser');
const { INVALID_PAYLOAD } = require('../../../../lib/util/httpStatus');

module.exports = (request, response, delegate, next) => {
  bodyParser.raw({ type: '*/*' })(request, response, next);
};

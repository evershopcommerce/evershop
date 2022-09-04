const { buildUrl } = require('../../../../../lib/router/buildUrl');

// eslint-disable-next-line no-unused-vars
module.exports = (request, response, stack, next) => {
  response.redirect(301, buildUrl('homepage'));
};

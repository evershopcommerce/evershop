const { buildUrl } = require('../../../../../lib/router/buildUrl');

module.exports = (request, response, stack, next) => {
  if (!request.session.orderId) {
    response.redirect(302, buildUrl('homepage'));
  } else {
    // TODO: Load order
    next();
  }
};

const { getContextValue } = require('../../../../graphql/services/contextHelper');
const { buildUrl } = require('../../../../../lib/router/buildUrl');

module.exports = (request, response, stack, next) => {
  next();
};

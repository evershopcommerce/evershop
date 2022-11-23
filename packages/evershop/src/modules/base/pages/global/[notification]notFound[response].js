const { assign } = require('../../../../lib/util/assign');

module.exports = async (request, response, stack, next) => {
  if (response.statusCode !== 404) {
    next();
  } else {
    assign(response.context, { metaTitle: 'Not found', metaDescription: 'Not found' });
    next();
  }
};

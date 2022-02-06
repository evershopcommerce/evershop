const { assign } = require('../../../../../lib/util/assign');

module.exports = (request, response) => {
  assign(response.context, { metaTitle: 'Shopping cart' });
};

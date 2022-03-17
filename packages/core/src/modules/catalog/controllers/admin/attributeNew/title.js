const { assign } = require('../../../../../lib/util/assign');

module.exports = (request, response) => {
  assign(response.context, { page: { heading: 'Create a new attribute' } });
};

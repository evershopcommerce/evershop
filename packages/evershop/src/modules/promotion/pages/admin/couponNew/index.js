const {
  setContextValue
} = require('../../../../graphql/services/contextHelper');

module.exports = (request) => {
  setContextValue(request, 'pageInfo', {
    title: 'Create a new coupon',
    description: 'Create a new coupon'
  });
};

const { setContextValue } = require("../../../../graphql/services/contextHelper");

module.exports = (request, response) => {
  setContextValue(request, 'pageInfo', {
    title: 'Shopping cart',
    description: 'Shopping cart'
  });
};

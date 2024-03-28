const { setContextValue } = require('@evershop/evershop/src/modules/graphql/services/contextHelper');

module.exports = async (request, response, stack, next) => {
  setContextValue(request, 'pageInfo', {
        title: 'All Products',
        description: 'All Products',
        url: request.url
      });
      next();
};

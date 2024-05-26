const { setContextValue } = require('@evershop/evershop/src/modules/graphql/services/contextHelper');

module.exports = async (request, response, stack, next) => {
  setContextValue(request, 'pageInfo', {
        title: 'Todos os Produtos',
        description: 'Todos os Produtos',
        url: request.url
      });
      next();
};

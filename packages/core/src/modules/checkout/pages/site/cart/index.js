const { setContextValue } = require("../../../../graphql/services/buildContext");

module.exports = (request, response) => {
  setContextValue('pageInfo', {
    title: 'Shopping cart',
    description: 'Shopping cart'
  });
};

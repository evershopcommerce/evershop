const { setContextValue } = require("../../../../graphql/services/contextHelper");

module.exports = (request, response) => {
  setContextValue(request, 'pageInfo', {
    title: 'Store Setting',
    description: 'Store Setting'
  });
}
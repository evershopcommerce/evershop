const { setContextValue } = require("../../../../graphql/services/contextHelper");

module.exports = (request, response) => {
  setContextValue(request, 'pageInfo', {
    title: 'Payment Setting',
    description: 'Payment Setting'
  });
}
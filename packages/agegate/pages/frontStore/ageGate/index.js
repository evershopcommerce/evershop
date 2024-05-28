const { setContextValue } = require("@evershop/evershop/src/modules/graphql/services/contextHelper");

module.exports = (request) => {
  setContextValue(request, 'pageInfo', {
    title: 'Age Gate',
    description: 'Age Gate'
  })
};
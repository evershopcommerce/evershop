const {
  setContextValue
} = require('../../../../graphql/services/contextHelper');

module.exports = (request) => {
  setContextValue(request, 'pageInfo', {
    title: 'Payment Setting',
    description: 'Payment Setting'
  });
};

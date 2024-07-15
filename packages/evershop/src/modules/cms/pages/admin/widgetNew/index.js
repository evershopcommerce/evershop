const {
  setContextValue
} = require('../../../../graphql/services/contextHelper');

// eslint-disable-next-line no-unused-vars
module.exports = (request, response) => {
  setContextValue(request, 'pageInfo', {
    title: 'Create a new widget',
    description: 'Create a new widget'
  });
};

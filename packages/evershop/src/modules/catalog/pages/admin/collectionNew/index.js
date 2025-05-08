const {
  setContextValue
} = require('../../../../graphql/services/contextHelper');

module.exports = (request, response) => {
  setContextValue(request, 'pageInfo', {
    title: 'Create a new collection',
    description: 'Create a new collection'
  });
};

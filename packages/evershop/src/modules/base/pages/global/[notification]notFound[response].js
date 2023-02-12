const { setContextValue } = require('../../../graphql/services/contextHelper');

module.exports = async (request, response, delegate, next) => {
  if (response.statusCode !== 404) {
    next();
  } else {
    setContextValue(request, 'pageInfo', {
      title: 'Not found',
      description: 'Page not found'
    });
    next();
  }
};

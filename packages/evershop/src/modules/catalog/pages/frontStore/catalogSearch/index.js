const { get } = require('@evershop/evershop/src/lib/util/get');

module.exports = (request, response, delegate, next) => {
  // Get the keyword from the request query
  const keyword = get(request, 'query.keyword');
  if (!keyword) {
    // Redirect to the home page if no keyword is not provided
    response.redirect('/');
  } else {
    next();
  }
};

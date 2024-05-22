const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');

module.exports = async (request, response, delegate, next) => {
  // Get the age verify cookie
  const ageVerifyCookie = request.cookies['age-verified'];
  if (!ageVerifyCookie || parseInt(ageVerifyCookie, 10) !== 1) {
    // Get the current route
    const { currentRoute } = request;
    if (
      currentRoute.id === 'ageGate' ||
      currentRoute.id === 'ageVerifyFailure'
    ) {
      return next();
    } else {
      return response.redirect(buildUrl('ageGate'));
    }
  } else {
    return next();
  }
};

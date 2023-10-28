const { getEnv } = require('@evershop/evershop/src/lib/util/getEnv');
const { UNAUTHORIZED } = require('@evershop/evershop/src/lib/util/httpStatus');

module.exports = (request, response, delegate, next) => {
  const { currentRoute } = request;
  if (
    request.method === 'GET' ||
    currentRoute?.id === 'adminGraphql' ||
    currentRoute?.access === 'public'
  ) {
    next();
  } else {
    const user = request.getCurrentUser();
    const currentUserEmail = user?.email;
    const demoUserEmails = getEnv('DEMO_USER_EMAILS', '').split(',');

    if (demoUserEmails && demoUserEmails.includes(currentUserEmail)) {
      response.status(UNAUTHORIZED).json({
        error: {
          status: UNAUTHORIZED,
          message: 'The demo account is not allowed to make changes'
        }
      });
    } else {
      next();
    }
  }
};

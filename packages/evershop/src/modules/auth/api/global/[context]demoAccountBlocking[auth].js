const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { UNAUTHORIZED } = require('@evershop/evershop/src/lib/util/httpStatus');

module.exports = (request, response, delegate, next) => {
  if (request.method === 'GET' || request.currentRoute?.id === 'adminGraphql') {
    next();
  } else {
    const user = request.getCurrentUser();
    const currentUserEmail = user?.email;
    const demoUserEmail = getConfig('system.demoUser');
    if (demoUserEmail && currentUserEmail === demoUserEmail) {
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

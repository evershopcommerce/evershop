const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { UNAUTHORIZED } = require('@evershop/evershop/src/lib/util/httpStatus');
const { getContextValue } = require('../../../graphql/services/contextHelper');

module.exports = (request, response, delegate, next) => {
  if (request.method === 'GET' || request.currentRoute?.id === 'adminGraphql') {
    next();
  } else {
    const userTokenPayload = getContextValue(request, 'userTokenPayload');
    const currentUserEmail = userTokenPayload?.user?.email;
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

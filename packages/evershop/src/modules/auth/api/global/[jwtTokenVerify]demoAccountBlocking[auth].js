const { getConfig } = require('../../../../lib/util/getConfig');
const { UNAUTHORIZED } = require('../../../../lib/util/httpStatus');
const { getContextValue } = require('../../../graphql/services/contextHelper');

module.exports = (request, response, delegate, next) => {
  if (request.method == 'GET') {
    next();
  } else {
    const tokenPayLoad = getContextValue(request, 'tokenPayload');
    const currentUserEmail = tokenPayLoad?.user?.email;
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

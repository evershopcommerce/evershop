const { getConfig } = require('../../../../../lib/util/getConfig');
const { getContextValue } = require('../../../../graphql/services/contextHelper');

module.exports = (request, response, stack, next) => {
  if (request.method == "GET") {
    next();
  } else {
    const tokenPayLoad = getContextValue(request, 'tokenPayload');
    const currentUserEmail = tokenPayLoad?.user?.email;
    const demoUserEmail = getConfig('system.demoUser');
    if (demoUserEmail && currentUserEmail === demoUserEmail) {
      response.json({
        success: false,
        message: 'The demo account is not allowed to make changes'
      });
    } else {
      next();
    }
  }
};

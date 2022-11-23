const { getContextValue, setContextValue } = require('../../../../graphql/services/contextHelper');
const { get } = require('../../../../../lib/util/get');

module.exports = (request, response, stack, next) => {
  // Get the token Payload
  const tokenPayLoad = getContextValue(request, 'tokenPayload');
  console.log('tokenPayLoad', tokenPayLoad)
  if (get(tokenPayLoad, 'user.uuid')) {
    setContextValue(request, 'customerId', tokenPayLoad.user?.uuid || null);
  }
  next();
};

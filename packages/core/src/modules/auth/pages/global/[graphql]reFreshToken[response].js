const { getContextValue, setContextValue } = require('../../../graphql/services/buildContext');
const { getTokenCookieId } = require('../../services/getTokenCookieId');
const { signToken } = require('../../services/refreshToken');
const { v4: uuidv4 } = require('uuid');

module.exports = (request, response, stack, next) => {
  /** If we get here, the token is already verified */
  // Update the token with new expiry
  const payload = Object.assign({ customerId: null, cartId: null, customerEmail: null, sid: uuidv4() }, getContextValue('tokenPayload') || {});
  signToken(
    payload,
    { expiresIn: '2d' },
    (newToken) => {
      response.cookie(getTokenCookieId(), newToken, { maxAge: 172800000, httpOnly: true });
      setContextValue('token', newToken);
    }
  );
  next();
};

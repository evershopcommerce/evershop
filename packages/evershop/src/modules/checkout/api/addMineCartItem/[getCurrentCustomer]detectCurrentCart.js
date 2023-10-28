const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { select } = require('@evershop/postgres-query-builder');
const { UNAUTHORIZED } = require('@evershop/evershop/src/lib/util/httpStatus');
const { setContextValue } = require('../../../graphql/services/contextHelper');

module.exports = async (request, response, delegate, next) => {
  /**
   * We firstly get the sessionID from the request.
   * This API needs the client to send the session cookie in the request.
   * Base on the sessionID, we can get the cart
   */
  const { sessionID } = request.locals;
  if (!sessionID) {
    response.status(UNAUTHORIZED);
    response.json({
      error: {
        status: UNAUTHORIZED,
        message: 'Unauthorized'
      }
    });
  } else {
    const cart = await select()
      .from('cart')
      .where('sid', '=', sessionID)
      .and('status', '=', 1)
      .load(pool);
    if (cart) {
      setContextValue(request, 'cartId', cart.uuid);
    }
    next();
  }
};

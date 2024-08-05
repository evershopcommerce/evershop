const { warning } = require('@evershop/evershop/src/lib/log/logger');
const {
  INTERNAL_SERVER_ERROR,
  OK
} = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = (request, response, delegate, next) => {
  try {
    request.logoutCustomer((error) => {
      if (error) {
        response.status(INTERNAL_SERVER_ERROR);
        response.json({
          error: {
            status: INTERNAL_SERVER_ERROR,
            message: error.message
          }
        });
      } else {
        response.status(OK);
        response.$body = {
          data: {}
        };
        // When a logged in user is logging out
        // Delete the cookie/session and the website
        // Will generate another session automatically
        request.session.destroy((err) => {
          if (err) {
            // log if an error
            warning(
              `error in deleting session. sid:${request.session.id}, cartId:${request.session.cartID}, customerId:${request.session.customerID}`
            );
          }
          response.clearCookie('sid');
        });
        next();
      }
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};

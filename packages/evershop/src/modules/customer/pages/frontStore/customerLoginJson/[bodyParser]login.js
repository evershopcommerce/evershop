const {
  translate
} = require('@evershop/evershop/src/lib/locale/translate/translate');
const {
  INVALID_PAYLOAD,
  OK,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  const { body } = request;
  const { email, password } = body;
  const message = translate('Invalid email or password');
  try {
    await request.loginCustomerWithEmail(email, password, (error) => {
      if (error) {
        response.status(INTERNAL_SERVER_ERROR);
        response.json({
          error: {
            status: INTERNAL_SERVER_ERROR,
            message
          }
        });
      } else {
        response.status(OK);
        response.$body = {
          data: {
            sid: request.sessionID
          }
        };
        next();
      }
    });
  } catch (error) {
    response.status(INVALID_PAYLOAD);
    response.json({
      error: {
        status: INVALID_PAYLOAD,
        message: error.message
      }
    });
  }
};

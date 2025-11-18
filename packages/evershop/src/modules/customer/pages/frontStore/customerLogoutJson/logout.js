import {
  INTERNAL_SERVER_ERROR,
  OK
} from '../../../../../lib/util/httpStatus.js';

export default (request, response, next) => {
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

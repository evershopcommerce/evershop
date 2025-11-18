import {
  INTERNAL_SERVER_ERROR,
  OK
} from '../../../../../lib/util/httpStatus.js';

export default (request, response, next) => {
  try {
    request.logoutUser((error) => {
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
  } catch (error) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: error.message
      }
    });
  }
};

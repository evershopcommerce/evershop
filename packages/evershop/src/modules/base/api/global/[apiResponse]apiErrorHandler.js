import { error } from '../../../../lib/log/logger.js';
import { INTERNAL_SERVER_ERROR } from '../../../../lib/util/httpStatus.js';

export default async (err, request, response, next) => {
  error(err);
  // Check if the header is already sent or not.
  if (response.headersSent) {
    // TODO: Write a log message or next(error)?.
  } else {
    let status = INTERNAL_SERVER_ERROR;
    if (!response.statusCode || response.statusCode === 200) {
      response.status(status);
    } else {
      status = response.statusCode;
    }
    response.json({
      error: {
        status,
        message: err.message
      }
    });
  }
};

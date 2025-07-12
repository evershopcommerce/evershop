import isErrorHandlerTriggered from '../../../../lib/middleware/isErrorHandlerTriggered.js';

export default async (request, response, next) => {
  try {
    /** If a rejected middleware called next(error) without throwing an error */
    if (isErrorHandlerTriggered(response)) {
      return;
    } else {
      response.json(response.$body || {});
    }
  } catch (error) {
    if (!isErrorHandlerTriggered(response)) {
      next(error);
    } else {
      // Do nothing here since the next(error) is already called
      // when the error is thrown on each middleware
    }
  }
};

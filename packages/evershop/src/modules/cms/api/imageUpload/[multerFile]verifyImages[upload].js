import { INVALID_PAYLOAD } from '../../../../lib/util/httpStatus.js';

export default (request, response, next) => {
  if (!request.files || request.files.length === 0) {
    next();
  } else {
    // Make sure the files are images
    const test = request.files.find(
      (file) => !file.mimetype.startsWith('image')
    );
    if (test) {
      response.status(INVALID_PAYLOAD).json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Only images are allowed'
        }
      });
    } else {
      next();
    }
  }
};

const {
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = (request, response, delegate, next) => {
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

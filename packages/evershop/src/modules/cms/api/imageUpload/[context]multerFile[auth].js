const { mkdirSync } = require('fs');
const { join } = require('path');
const multer = require('multer');
const { CONSTANTS } = require('@evershop/evershop/src/lib/helpers');
const {
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');

const storage = multer.diskStorage({
  destination(request, file, cb) {
    const path = join(
      CONSTANTS.MEDIAPATH,
      (request.params[0] || '').replace(/\s/g, '-')
    );
    mkdirSync(path, { recursive: true });
    cb(null, path);
  },
  filename(request, file, cb) {
    cb(null, file.originalname.replace(/\s/g, '-'));
  }
});

function fileFilter(request, file, cb) {
  // Only accept images
  if (!/\.(jpe?g|png|gif|webp)$/i.test(file.originalname)) {
    cb(null, false);
  } else {
    cb(null, true);
  }
}

const upload = multer({ storage, fileFilter });

module.exports = (request, response, delegate, next) => {
  const path = request.params[0] || '';
  // eslint-disable-next-line no-useless-escape
  if (path && !/^[a-z0-9\/]+$/i.test(path)) {
    response.status(INVALID_PAYLOAD).json({
      error: {
        status: INVALID_PAYLOAD,
        message: 'Invalid path'
      }
    });
  } else {
    upload.array('images', 20)(request, response, next);
  }
};

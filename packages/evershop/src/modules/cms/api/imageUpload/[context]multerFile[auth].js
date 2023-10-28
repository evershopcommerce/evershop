const { mkdirSync } = require('fs');
const { join } = require('path');
const multer = require('multer');
const { CONSTANTS } = require('@evershop/evershop/src/lib/helpers');
const {
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');

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
    let filename = file.originalname.replace(/\s/g, '-');
    // Adding a random string to the filename to avoid conflict, keep the original extension
    // eslint-disable-next-line no-param-reassign
    filename = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 15)}-${filename}`;

    cb(null, filename);
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

const fileStorate = getConfig('file_storage', 'local');
let upload;
// Only ask multer to save the files to disk if the file storage is local
if (fileStorate === 'local') {
  // eslint-disable-next-line no-unused-vars
  upload = multer({ storage, fileFilter });
} else {
  // eslint-disable-next-line no-unused-vars
  upload = multer({ fileFilter });
}

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

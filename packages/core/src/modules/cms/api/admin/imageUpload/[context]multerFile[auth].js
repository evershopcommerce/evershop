const { mkdirSync } = require('fs');
const { join } = require('path');
const multer = require('multer');
const { CONSTANTS } = require('../../../../../lib/helpers');

const storage = multer.diskStorage({
  destination(request, file, cb) {
    const path = join(CONSTANTS.MEDIAPATH, (request.params[0] || '').replace(/\s/g, '-'));
    mkdirSync(path, { recursive: true });
    cb(null, path);
  },
  filename(request, file, cb) {
    cb(null, file.originalname.replace(/\s/g, '-'));
  }
});

function fileFilter(request, file, cb) {
  // Only accept images
  if (!/\.(jpe?g|png|gif)$/i.test(file.originalname)) {
    cb(null, false);
  } else {
    cb(null, true);
  }
}

const upload = multer({ storage, fileFilter });

module.exports = (request, response, stack, next) => {
  const path = request.params[0] || '';
  // eslint-disable-next-line no-useless-escape
  if (!path || !/^[a-z0-9\/]+$/i.test(path)) {
    response.json({ success: false, message: 'Invalid path' });
  } else {
    upload.array('images', 20)(request, response, next);
  }
};

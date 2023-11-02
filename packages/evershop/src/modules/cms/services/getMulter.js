const { mkdirSync } = require('fs');
const { join } = require('path');
const multer = require('multer');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { CONSTANTS } = require('@evershop/evershop/src/lib/helpers');
const { generateFileName } = require('./generateFileName');
const customMemoryStorage = require('./CustomMemoryStorage');

const filename = (request, file, cb) => {
  const fileName = generateFileName(file.originalname);
  cb(null, fileName);
};

function fileFilter(request, file, cb) {
  const allowedMimeTypes = getConfig('allowed_mime_types', [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif',
    'image/apng'
  ]);
  // Only accept images
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(
      new Error(
        "Only 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/apng' files are allowed"
      )
    );
  } else {
    return cb(null, true);
  }
}
const diskStorage = multer.diskStorage({
  destination(request, file, cb) {
    const path = join(
      CONSTANTS.MEDIAPATH,
      (request.params[0] || '').replace(/\s/g, '-')
    );
    mkdirSync(path, { recursive: true });
    cb(null, path);
  },
  filename
});

module.exports.getMulter = () => {
  const storageProvider = getConfig('system.file_storage', 'local');
  if (storageProvider === 'local') {
    return multer({ storage: diskStorage, fileFilter });
  } else {
    const memoryStorage = customMemoryStorage({ filename: generateFileName });
    return multer({ storage: memoryStorage, fileFilter });
  }
};

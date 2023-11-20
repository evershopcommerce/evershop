const multer = require('multer');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { generateFileName } = require('./generateFileName');
const customMemoryStorage = require('./CustomMemoryStorage');

function fileFilter(request, file, cb) {
  const allowedMimeTypes = getConfig('system.upload_allowed_mime_types', [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif',
    'image/apng'
  ]);
  // Only accept images
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('The file you are trying to upload is not allowed'));
  } else {
    return cb(null, true);
  }
}

module.exports.getMulter = () => {
  const memoryStorage = customMemoryStorage({ filename: generateFileName });
  return multer({ storage: memoryStorage, fileFilter });
};

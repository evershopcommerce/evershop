import multer from 'multer';
import { getConfig } from '../../../lib/util/getConfig.js';
import customMemoryStorage from './CustomMemoryStorage.js';
import { generateFileName } from './generateFileName.js';

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

export const getMulter = () => {
  const memoryStorage = customMemoryStorage({ filename: generateFileName });
  return multer({ storage: memoryStorage, fileFilter });
};

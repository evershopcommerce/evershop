import { INVALID_PAYLOAD } from '../../../../lib/util/httpStatus.js';
import { getMulter, getUploadHardCapMb } from '../../services/getMulter.js';

export default (request, response, next) => {
  const path = request.params[0] || '';
  if (path && !/^[a-zA-Z0-9_\/-]+$/i.test(path)) {
    response.status(INVALID_PAYLOAD).json({
      error: {
        status: INVALID_PAYLOAD,
        message:
          'Invalid path. Path must be alphanumeric and can include underscores and hyphens only.'
      }
    });
  } else {
    // A fresh multer per request: the size limits read live configuration.
    getMulter().array('images', 20)(request, response, (error) => {
      if (error) {
        let message = error.message;
        // Covers both the per-type limit (CustomMemoryStorage, carries
        // limitMb/mimetype) and multer's own hard-cap error.
        if (error.code === 'LIMIT_FILE_SIZE') {
          message =
            error.limitMb !== undefined
              ? `The file is too large. The maximum allowed size for ${error.mimetype} files is ${error.limitMb} MB.`
              : `The file is too large. The maximum allowed size is ${getUploadHardCapMb()} MB.`;
        }
        response.status(INVALID_PAYLOAD).json({
          error: {
            status: INVALID_PAYLOAD,
            message
          }
        });
        return;
      }
      next();
    });
  }
};

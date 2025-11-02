import { INVALID_PAYLOAD } from '../../../../lib/util/httpStatus.js';
import { getMulter } from '../../services/getMulter.js';

const upload = getMulter();

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
    upload.array('images', 20)(request, response, next);
  }
};

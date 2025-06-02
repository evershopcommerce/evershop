import { INVALID_PAYLOAD } from '../../../../lib/util/httpStatus.js';
import { getMulter } from '../../services/getMulter.js';

const upload = getMulter();

export default (request, response, delegate, next) => {
  const path = request.params[0] || '';

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

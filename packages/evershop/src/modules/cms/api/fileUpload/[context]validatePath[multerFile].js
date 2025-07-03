import { CONSTANTS } from '../../../../lib/helpers.js';
import { INVALID_PAYLOAD } from '../../../../lib/util/httpStatus.js';
import { validatePath } from '../../services/validatePath.js';

export default (request, response, next) => {
  const path = request.params[0] || '';
  // Validate the path to avoid Relative Path Traversal attack
  if (validatePath(CONSTANTS.MEDIAPATH, path) === false) {
    response.status(INVALID_PAYLOAD).json({
      error: {
        status: INVALID_PAYLOAD,
        message: 'Invalid path'
      }
    });
  } else {
    next();
  }
};

import { CONSTANTS } from '../../../../lib/helpers.js';
import { INVALID_PAYLOAD } from '../../../../lib/util/httpStatus.js';
import { validatePath } from '../../services/validatePath.js';

export default (request, response, next) => {
  const { path } = request.body || '';
  // Validate the path to avoid Relative Path Traversal attack
  if (
    validatePath(CONSTANTS.MEDIAPATH, path) === false ||
    !/^[a-zA-Z0-9_\/-]+$/i.test(path)
  ) {
    response.status(INVALID_PAYLOAD).json({
      error: {
        status: INVALID_PAYLOAD,
        message:
          'Invalid path. Path must be alphanumeric and can include underscores and hyphens only.'
      }
    });
  } else {
    next();
  }
};

import { INVALID_PAYLOAD } from '../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../types/request.js';
import { EvershopResponse } from '../../../types/response.js';

/**
 * The routes that change an import need a header that a form on another site
 * cannot send (§ 8.3): core has no CSRF protection on admin API routes, and an
 * import is large enough to deserve one more layer. The admin pages add it.
 *
 * Core reads a middleware by the folder it is in, and for an API route the folder
 * is the route (`api/startImportJob/`): a folder named `a+b` is a page's way to
 * share a file, and for an API it names a route that does not exist. So each of
 * the six routes has a file of its own, `[context]importRequestHeader[auth].ts`,
 * that hands over to this one.
 */
export default (
  request: EvershopRequest,
  response: EvershopResponse,
  next: (error?: unknown) => void
) => {
  if (request.get('X-Import-Request') !== '1') {
    response.status(INVALID_PAYLOAD).json({
      error: {
        status: INVALID_PAYLOAD,
        code: 'INVALID_REQUEST',
        message: 'The header "X-Import-Request: 1" is required.'
      }
    });
    return;
  }
  next();
};

import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import {
  preflightReplaceHomepage,
  ReplaceHomepageError
} from '../../services/landingPage/replaceHomepage.js';

/**
 * GET /api/landing-pages/:id/replace-homepage — read-only preflight for the
 * "Replace homepage with this page" dialog. 3-arg: writes its own status.
 */
export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next: (err?: unknown) => void
) => {
  try {
    const userId = Number((request as any).locals?.user?.admin_user_id);
    const data = await preflightReplaceHomepage(String(request.params.id), userId);
    response.status(OK).json({ data });
  } catch (e) {
    if (e instanceof ReplaceHomepageError) {
      response.status(e.status).json({
        error: { status: e.status, code: e.code, message: e.message }
      });
      return;
    }
    response.status(INTERNAL_SERVER_ERROR);
    next(e);
  }
};

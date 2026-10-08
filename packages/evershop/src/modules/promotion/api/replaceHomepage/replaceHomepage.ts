import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import {
  replaceHomepage,
  ReplaceHomepageError
} from '../../services/landingPage/replaceHomepage.js';

/**
 * POST /api/landing-pages/:id/replace-homepage
 * Body: { confirm: true, homepageFingerprint, landingPageFingerprint } (from preflight).
 * 3-arg: writes its own status; typed errors map to 404/409, the rest to 500.
 */
export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next: (err?: unknown) => void
) => {
  try {
    const userId = Number((request as any).locals?.user?.admin_user_id);
    const body = (request.body ?? {}) as Record<string, string>;
    const result = await replaceHomepage(String(request.params.id), {
      routeId: request.currentRoute?.id,
      userId,
      expectedFingerprints: {
        homepage: body.homepageFingerprint,
        landingPage: body.landingPageFingerprint
      }
    });
    response.status(OK).json({
      data: {
        ...result,
        links: [
          {
            rel: 'pageBuilderHomepage',
            href: buildUrl('pageBuilderEdit', { routeId: 'homepage' }),
            action: 'GET',
            types: ['text/xml']
          },
          {
            rel: 'backup',
            href: result.backup.editUrl,
            action: 'GET',
            types: ['text/xml']
          }
        ]
      }
    });
  } catch (e) {
    if (e instanceof ReplaceHomepageError) {
      response.status(e.status).json({
        error: {
          status: e.status,
          code: e.code,
          message: e.message,
          ...(e.rolloutPlans ? { rolloutPlans: e.rolloutPlans } : {})
        }
      });
      return;
    }
    response.status(INTERNAL_SERVER_ERROR);
    next(e);
  }
};

import { insert } from '@evershop/postgres-query-builder';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  BAD_REQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  UNAUTHORIZED
} from '../../../../lib/util/httpStatus.js';
import { CurrentUser, EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';

/**
 * POST /api/page-builder/changesets
 *
 * Body: { name: string }
 *
 * Creates a fresh changeset owned by the authenticated admin. Generates a
 * random preview token for use with `?changeset=<token>` in the iframe.
 */
// 3-arg signature: avoids the auto-next behavior of 2-arg handlers in
// `buildMiddlewareFunction` that re-runs apiResponse on an already-sent
// response (ERR_HTTP_HEADERS_SENT).
export default async (
  request: EvershopRequest,
  response: EvershopResponse,
   
  _next: (err?: unknown) => void
) => {
  const user = request.locals.user as CurrentUser | null | undefined;
  if (!user) {
    response.status(UNAUTHORIZED).json({
      error: { status: UNAUTHORIZED, message: 'Authentication required' }
    });
    return;
  }
  const name = (request.body?.name ?? '').toString().trim();
  if (!name) {
    response.status(BAD_REQUEST).json({
      error: { status: BAD_REQUEST, message: 'name is required' }
    });
    return;
  }
  try {
    const token = uuidv4();
    const row = await insert('changeset')
      .given({
        name,
        token,
        created_by: (user as any).admin_user_id ?? (user as any).adminUserId
      })
      .execute(pool);
    response.status(CREATED).json({ data: row });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR).json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e instanceof Error ? e.message : 'Failed to create changeset'
      }
    });
  }
};

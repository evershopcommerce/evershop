import { del, select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  BAD_REQUEST,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK
} from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';

/**
 * DELETE /api/page-builder/rollout-plans/:id
 *
 * Cancels (deletes) a rollout plan. The underlying changeset is not
 * touched — it persists for audit and could be re-scheduled later.
 *
 * Behavior:
 *   - Active rollouts (NOW() between start_time and end_time) are stopped
 *     immediately. The next storefront request stops applying the overlay
 *     (no scheduler involved per spec § 6.2 — overlay is checked per request).
 *   - Scheduled-but-not-yet-active rollouts simply never start.
 *   - Already-ended rollouts can also be deleted; this just cleans up.
 */
// 3-arg signature: avoid auto-next behavior of 2-arg handlers (causes
// ERR_HTTP_HEADERS_SENT via apiResponse).
export default async (
  request: EvershopRequest,
  response: EvershopResponse,
   
  _next: (err?: unknown) => void
) => {
  const planId = Number(request.params.id);
  if (!Number.isInteger(planId) || planId <= 0) {
    return response.status(BAD_REQUEST).json({
      error: { status: BAD_REQUEST, message: 'Invalid rollout plan id' }
    });
  }

  try {
    const plan = await select()
      .from('rollout_plan')
      .where('rollout_plan_id', '=', planId)
      .load(pool);
    if (!plan) {
      return response.status(NOT_FOUND).json({
        error: {
          status: NOT_FOUND,
          message: `Rollout plan ${planId} not found`
        }
      });
    }

    await del('rollout_plan')
      .where('rollout_plan_id', '=', planId)
      .execute(pool);
    return response.status(OK).json({ data: { cancelled: true } });
  } catch (e) {
    return response.status(INTERNAL_SERVER_ERROR).json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e instanceof Error ? e.message : 'Cancel failed'
      }
    });
  }
};

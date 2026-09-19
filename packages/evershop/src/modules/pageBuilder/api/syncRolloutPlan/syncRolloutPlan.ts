import { select } from '@evershop/postgres-query-builder';
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
 * POST /api/page-builder/rollout-plans/:id/sync
 *
 * The Save action in rollout-edit mode. Copies `changeset.route_cursors`
 * into `rollout_plan.route_cursors`, promoting the editor's current view to
 * the live storefront view (since `loadActiveOps` filters by the rollout's
 * cursors in production).
 *
 * Idempotent — when the editor and the rollout already match, the UPDATE
 * simply rewrites the same JSONB.
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

    const changeset = await select()
      .from('changeset')
      .where('changeset_id', '=', (plan as any).changeset_id)
      .load(pool);
    if (!changeset) {
      return response.status(NOT_FOUND).json({
        error: {
          status: NOT_FOUND,
          message: `Changeset ${(plan as any).changeset_id} not found`
        }
      });
    }
    if ((changeset as any).published_at) {
      return response.status(BAD_REQUEST).json({
        error: {
          status: BAD_REQUEST,
          message: 'Cannot sync a published changeset'
        }
      });
    }

    const cursors =
      ((changeset as any).route_cursors as Record<string, number> | null) ?? {};

    await pool.query(
      `UPDATE rollout_plan
         SET route_cursors = $1::jsonb,
             updated_at = NOW()
       WHERE rollout_plan_id = $2`,
      [JSON.stringify(cursors), planId]
    );

    return response.status(OK).json({
      data: { synced: true, routeCursors: cursors }
    });
  } catch (e) {
    return response.status(INTERNAL_SERVER_ERROR).json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e instanceof Error ? e.message : 'Sync failed'
      }
    });
  }
};

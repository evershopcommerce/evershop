import { pool } from '../../../../lib/postgres/connection.js';
import { camelCase } from '../../../../lib/util/camelCase.js';
import {
  BAD_REQUEST,
  INTERNAL_SERVER_ERROR,
  OK
} from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';

type Status = 'active' | 'upcoming' | 'past' | 'all';

const VALID_STATUSES: Status[] = ['active', 'upcoming', 'past', 'all'];

/**
 * GET /api/page-builder/rollout-plans
 *
 * Returns rollout plans with their associated changeset summary. Optional
 * `?status=active|upcoming|past|all` filter (default: all).
 *
 *   - active   = start_time <= NOW() AND (end_time IS NULL OR end_time > NOW())
 *   - upcoming = start_time > NOW()
 *   - past     = end_time IS NOT NULL AND end_time <= NOW()
 *   - all      = no time filter
 *
 * Per spec § 5.9, indefinite rollouts (end_time IS NULL) sort first within
 * the active set with an `indefinite: true` flag in the response so callers
 * can flag them in UI.
 */
// 3-arg signature so `buildMiddlewareFunction` respects our manual `next()`
// handling. With a 2-arg handler the framework auto-calls `next()` after
// resolve, which then runs apiResponse and tries to re-send headers —
// ERR_HTTP_HEADERS_SENT. We send the response directly via `.json()` and
// deliberately do not call `next()`.
export default async (
  request: EvershopRequest,
  response: EvershopResponse,
   
  _next: (err?: unknown) => void
) => {
  const rawStatus = (request.query.status as string | undefined) ?? 'all';
  if (!VALID_STATUSES.includes(rawStatus as Status)) {
    response.status(BAD_REQUEST).json({
      error: {
        status: BAD_REQUEST,
        message: `Invalid status. Expected one of: ${VALID_STATUSES.join(', ')}`
      }
    });
    return;
  }
  const status = rawStatus as Status;

  const where = (() => {
    switch (status) {
      case 'active':
        return 'WHERE start_time <= NOW() AND (end_time IS NULL OR end_time > NOW())';
      case 'upcoming':
        return 'WHERE start_time > NOW()';
      case 'past':
        return 'WHERE end_time IS NOT NULL AND end_time <= NOW()';
      case 'all':
      default:
        return '';
    }
  })();

  // Indefinite (end_time IS NULL) rollouts surface first, then the rest by start_time desc.
  const orderBy =
    'ORDER BY (end_time IS NULL) DESC, start_time DESC, rollout_plan_id DESC';

  try {
    const plansResult = await pool.query(
      `SELECT rp.*,
              cs.name           AS changeset_name,
              cs.uuid           AS changeset_uuid,
              cs.published_at   AS changeset_published_at,
              (
                SELECT COUNT(*)::int
                  FROM changeset_operation co
                 WHERE co.changeset_id = rp.changeset_id
              ) AS operation_count
         FROM rollout_plan rp
         JOIN changeset cs ON cs.changeset_id = rp.changeset_id
        ${where}
        ${orderBy}`
    );

    const rolloutPlans = plansResult.rows.map((row) => {
      const c = camelCase(row);
      return {
        rolloutPlanId: c.rolloutPlanId,
        uuid: c.uuid,
        name: c.name,
        changesetId: c.changesetId,
        startTime: c.startTime,
        endTime: c.endTime,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        indefinite: c.endTime === null,
        changeset: {
          name: c.changesetName,
          uuid: c.changesetUuid,
          publishedAt: c.changesetPublishedAt,
          operationCount: c.operationCount
        }
      };
    });

    response.status(OK).json({
      data: {
        status,
        rolloutPlans
      }
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR).json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e instanceof Error ? e.message : 'List rollout plans failed'
      }
    });
  }
};

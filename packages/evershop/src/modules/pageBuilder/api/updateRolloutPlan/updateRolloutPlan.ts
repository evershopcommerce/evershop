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
 * PATCH /api/page-builder/rollout-plans/:id
 *
 * Edits the schedule + name of an existing rollout plan. Mirrors the
 * validation in `createRolloutPlan` (required name, valid start_time, end
 * after start if present) and runs the same overlap check, excluding self by
 * `rollout_plan_id` so an in-place edit can keep the same window.
 *
 * Body:
 *   {
 *     name: string,
 *     start_time: ISO timestamp,
 *     end_time: ISO timestamp | null
 *   }
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

  const body = request.body ?? {};
  const errors: string[] = [];

  const name =
    typeof body.name === 'string' && body.name.trim() !== ''
      ? body.name.trim()
      : null;
  if (!name) errors.push('name is required');

  const startTime = body.start_time ? new Date(body.start_time) : null;
  if (!startTime || Number.isNaN(startTime.getTime())) {
    errors.push('start_time is required (ISO timestamp)');
  }

  let endTime: Date | null = null;
  if (body.end_time != null) {
    endTime = new Date(body.end_time);
    if (Number.isNaN(endTime.getTime())) {
      errors.push('end_time, when provided, must be an ISO timestamp');
    } else if (startTime && endTime <= startTime) {
      errors.push('end_time must be after start_time');
    }
  }

  if (errors.length > 0) {
    return response.status(BAD_REQUEST).json({
      error: { status: BAD_REQUEST, message: errors.join('; ') }
    });
  }

  try {
    const existing = await select()
      .from('rollout_plan')
      .where('rollout_plan_id', '=', planId)
      .load(pool);
    if (!existing) {
      return response.status(NOT_FOUND).json({
        error: {
          status: NOT_FOUND,
          message: `Rollout plan ${planId} not found`
        }
      });
    }

    // Overlap check (excluding self) — same algorithm as createRolloutPlan.
    const overlap = await pool.query(
      `SELECT rollout_plan_id, name, start_time, end_time
       FROM rollout_plan
       WHERE rollout_plan_id <> $1
         AND (end_time IS NULL OR end_time > NOW())
         AND start_time < $3
         AND ($2::timestamptz IS NULL OR end_time IS NULL OR end_time > $4)`,
      [
        planId,
        endTime,
        endTime ?? new Date('9999-12-31T23:59:59Z'),
        startTime
      ]
    );
    if (overlap.rows.length > 0) {
      return response.status(BAD_REQUEST).json({
        error: {
          status: BAD_REQUEST,
          message: `Proposed rollout overlaps with existing rollout(s): ${overlap.rows
            .map((r: any) => r.name)
            .join(', ')}`
        }
      });
    }

    await pool.query(
      `UPDATE rollout_plan
         SET name = $1,
             start_time = $2,
             end_time = $3,
             updated_at = NOW()
       WHERE rollout_plan_id = $4`,
      [name, startTime, endTime, planId]
    );

    const updated = await select()
      .from('rollout_plan')
      .where('rollout_plan_id', '=', planId)
      .load(pool);

    return response.status(OK).json({ data: updated });
  } catch (e) {
    return response.status(INTERNAL_SERVER_ERROR).json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e instanceof Error ? e.message : 'Failed to update rollout plan'
      }
    });
  }
};

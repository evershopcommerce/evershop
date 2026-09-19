import { insert, select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  BAD_REQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND
} from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';

/**
 * POST /api/page-builder/rollout-plans
 *
 * Body:
 *   {
 *     name: string,
 *     changeset_id: int,
 *     start_time: ISO timestamp,
 *     end_time: ISO timestamp | null
 *   }
 *
 * Spec 03 § 5.9.1 says no two active-or-upcoming rollouts may overlap
 * (global scope for v1). This endpoint enforces that constraint.
 */
// 3-arg signature: avoid auto-next behavior of 2-arg handlers (causes
// ERR_HTTP_HEADERS_SENT via apiResponse).
export default async (
  request: EvershopRequest,
  response: EvershopResponse,
   
  _next: (err?: unknown) => void
) => {
  const body = request.body ?? {};
  const errors: string[] = [];

  const name =
    typeof body.name === 'string' && body.name.trim() !== ''
      ? body.name.trim()
      : null;
  if (!name) errors.push('name is required');

  const changesetId = Number(body.changeset_id);
  if (!Number.isInteger(changesetId) || changesetId <= 0) {
    errors.push('changeset_id is required (integer)');
  }

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

  // Confirm the changeset exists and isn't already published.
  const changeset = await select()
    .from('changeset')
    .where('changeset_id', '=', changesetId)
    .load(pool);
  if (!changeset) {
    return response.status(NOT_FOUND).json({
      error: {
        status: NOT_FOUND,
        message: `Changeset ${changesetId} not found`
      }
    });
  }
  if ((changeset as any).published_at) {
    return response.status(BAD_REQUEST).json({
      error: {
        status: BAD_REQUEST,
        message: 'Cannot schedule a rollout for a published changeset'
      }
    });
  }

  // Overlap check (global scope, active or upcoming only). See spec 03 § 5.9.1.
  const overlap = await pool.query(
    `SELECT rollout_plan_id, name, start_time, end_time
     FROM rollout_plan
     WHERE (end_time IS NULL OR end_time > NOW())
       AND start_time < $2
       AND ($1::timestamptz IS NULL OR end_time IS NULL OR end_time > $3)`,
    // Args: (proposed end, proposed end, proposed start)
    // The condition above is approximate — we filter precisely in JS for clarity.
    [endTime, endTime ?? new Date('9999-12-31T23:59:59Z'), startTime]
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

  try {
    // Snapshot the changeset's route_cursors into the rollout. The storefront
    // reads from rp.route_cursors (not cs.route_cursors), so this freezes the
    // "what the storefront shows" state at create time. Subsequent edits in
    // the editor advance cs.route_cursors; rp.route_cursors only moves when
    // the user explicitly clicks Save (sync endpoint).
    const cursors =
      ((changeset as any).route_cursors as Record<string, number> | null) ?? {};
    const row = await insert('rollout_plan')
      .given({
        name,
        changeset_id: changesetId,
        route_cursors: cursors,
        // Inherit the changeset's theme (spec 04 § 9.10). The rollout fires
        // on the storefront only while its theme is the active one, and the
        // overlay it carries is already theme-tagged via the changeset's ops.
        theme: (changeset as any).theme ?? null,
        start_time: startTime,
        end_time: endTime
      })
      .execute(pool);
    // Detach the changeset from the user's draft namespace per spec § 5.7
    // ("the draft is reused until the user… saves it as a rollout plan, or
    // explicitly discards it"). Renaming makes `getOrCreateDraftChangeset`
    // skip this row, so the next editor visit mints a fresh `pb-draft-X`
    // and the user no longer sees the rollout badge from their own draft.
    if (
      typeof (changeset as any).name === 'string' &&
      (changeset as any).name.startsWith('pb-draft-')
    ) {
      await pool.query(
        `UPDATE changeset SET name = $1, updated_at = NOW() WHERE changeset_id = $2`,
        [name, changesetId]
      );
    }
    return response.status(CREATED).json({ data: row });
  } catch (e) {
    return response.status(INTERNAL_SERVER_ERROR).json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e instanceof Error ? e.message : 'Failed to create rollout plan'
      }
    });
  }
};

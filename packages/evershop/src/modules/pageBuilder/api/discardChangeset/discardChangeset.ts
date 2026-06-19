import {
  commit,
  del,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  BAD_REQUEST,
  FORBIDDEN,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK
} from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';

/**
 * POST /api/page-builder/changesets/:id/discard
 *
 * Two semantic modes depending on whether the changeset is rollout-attached:
 *
 *  - **Draft (no rollout_plan).** "Discard" means "throw the edits away."
 *    Per-route: delete ops on that route, clear the cursor entry; if the
 *    changeset has no remaining ops, drop the changeset row too.
 *    Full: delete all ops and the changeset row (rollout_plan rows would
 *    cascade — but there are none in this branch).
 *
 *  - **Rollout-attached changeset.** "Discard" means "revert to the saved
 *    snapshot." The rollout's `route_cursors` is the floor — the storefront
 *    sees that state. We never delete the changeset or the rollout here;
 *    we only roll back the editor's view.
 *    Per-route: set `changeset.route_cursors[route]` back to
 *    `rollout.route_cursors[route]` and delete ops on that route with
 *    `change_order > restored cursor`.
 *    Full: same, but across every route present in either cursor map.
 *
 * Refuses to discard published changesets — those are part of the audit
 * trail.
 *
 * Authorization: only the changeset's `created_by` admin user (or any
 * admin user — V1 keeps it simple by allowing all admins) can discard.
 */
// 3-arg signature: avoid auto-next behavior of 2-arg handlers (causes
// ERR_HTTP_HEADERS_SENT via apiResponse).
export default async (
  request: EvershopRequest,
  response: EvershopResponse,
   
  _next: (err?: unknown) => void
) => {
  const changesetId = Number(request.params.id);
  if (!Number.isInteger(changesetId) || changesetId <= 0) {
    return response.status(BAD_REQUEST).json({
      error: { status: BAD_REQUEST, message: 'Invalid changeset id' }
    });
  }

  const userId = (request as any).locals?.user?.admin_user_id;
  if (!userId) {
    return response.status(FORBIDDEN).json({
      error: { status: FORBIDDEN, message: 'Admin auth required' }
    });
  }

  const conn = await getConnection();
  await startTransaction(conn);
  try {
    const changeset = await select()
      .from('changeset')
      .where('changeset_id', '=', changesetId)
      .load(conn);
    if (!changeset) {
      await rollback(conn);
      return response.status(NOT_FOUND).json({
        error: {
          status: NOT_FOUND,
          message: `Changeset ${changesetId} not found`
        }
      });
    }
    if ((changeset as any).published_at) {
      await rollback(conn);
      return response.status(BAD_REQUEST).json({
        error: {
          status: BAD_REQUEST,
          message: 'Cannot discard a published changeset'
        }
      });
    }

    const routeFilter =
      typeof request.query?.route === 'string' && request.query.route.length > 0
        ? String(request.query.route)
        : null;

    // Rollout-attached changesets get the "revert to saved" semantics.
    const rolloutPlan = await select()
      .from('rollout_plan')
      .where('changeset_id', '=', changesetId)
      .load(conn);

    if (rolloutPlan) {
      const savedCursors =
        ((rolloutPlan as any).route_cursors as Record<string, number> | null) ??
        {};
      const editorCursors =
        ((changeset as any).route_cursors as Record<string, number> | null) ??
        {};

      if (routeFilter) {
        const restored = Number(savedCursors[routeFilter] ?? 0);
        await conn.query(
          `DELETE FROM changeset_operation
           WHERE changeset_id = $1 AND route = $2 AND change_order > $3`,
          [changesetId, routeFilter, restored]
        );
        const nextCursors: Record<string, number> = { ...editorCursors };
        if (restored > 0) nextCursors[routeFilter] = restored;
        else delete nextCursors[routeFilter];
        await conn.query(
          `UPDATE changeset
             SET route_cursors = $1::jsonb,
                 updated_at = NOW()
           WHERE changeset_id = $2`,
          [JSON.stringify(nextCursors), changesetId]
        );
        await commit(conn);
        return response.status(OK).json({
          data: {
            discarded: true,
            mode: 'route',
            route: routeFilter,
            rollout: true,
            changesetDeleted: false
          }
        });
      }

      // Full revert — union of every route present in either map so we don't
      // miss orphans (e.g. user added a new route since Save).
      const allRoutes = new Set<string>([
        ...Object.keys(editorCursors),
        ...Object.keys(savedCursors)
      ]);
      for (const route of allRoutes) {
        const restored = Number(savedCursors[route] ?? 0);
        await conn.query(
          `DELETE FROM changeset_operation
           WHERE changeset_id = $1 AND route = $2 AND change_order > $3`,
          [changesetId, route, restored]
        );
      }
      await conn.query(
        `UPDATE changeset
           SET route_cursors = $1::jsonb,
               updated_at = NOW()
         WHERE changeset_id = $2`,
        [JSON.stringify(savedCursors), changesetId]
      );
      await commit(conn);
      return response.status(OK).json({
        data: {
          discarded: true,
          mode: 'all',
          rollout: true,
          changesetDeleted: false
        }
      });
    }

    if (routeFilter) {
      // Draft per-route discard. Drop ops on this route and clear the cursor
      // entry. Done in one transaction so the changeset never appears mid-state.
      await conn.query(
        `DELETE FROM changeset_operation
         WHERE changeset_id = $1 AND route = $2`,
        [changesetId, routeFilter]
      );

      // Count remaining ops; if zero, drop the changeset row too.
      const remainingRes = await conn.query(
        `SELECT COUNT(*)::int AS count FROM changeset_operation WHERE changeset_id = $1`,
        [changesetId]
      );
      const remaining = Number((remainingRes.rows[0] as any)?.count ?? 0);

      if (remaining === 0) {
        await del('changeset')
          .where('changeset_id', '=', changesetId)
          .execute(conn);
        await commit(conn);
        return response.status(OK).json({
          data: { discarded: true, mode: 'route', route: routeFilter, changesetDeleted: true }
        });
      }

      // Strip the route's cursor entry from route_cursors.
      const cursors =
        ((changeset as any).route_cursors as Record<string, number> | null) ??
        {};
      const nextCursors: Record<string, number> = { ...cursors };
      delete nextCursors[routeFilter];

      await conn.query(
        `UPDATE changeset
           SET route_cursors = $1::jsonb,
               updated_at = NOW()
         WHERE changeset_id = $2`,
        [JSON.stringify(nextCursors), changesetId]
      );

      await commit(conn);
      return response.status(OK).json({
        data: {
          discarded: true,
          mode: 'route',
          route: routeFilter,
          changesetDeleted: false
        }
      });
    }

    // Draft full discard. Operations cascade-delete when the changeset row
    // goes; we do the same in two steps for clarity.
    await del('changeset_operation')
      .where('changeset_id', '=', changesetId)
      .execute(conn);
    await del('changeset')
      .where('changeset_id', '=', changesetId)
      .execute(conn);

    await commit(conn);
    return response.status(OK).json({
      data: { discarded: true, mode: 'all', changesetDeleted: true }
    });
  } catch (e) {
    await rollback(conn);
    return response.status(INTERNAL_SERVER_ERROR).json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e instanceof Error ? e.message : 'Discard failed'
      }
    });
  }
};

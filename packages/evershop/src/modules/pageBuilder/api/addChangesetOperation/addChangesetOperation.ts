import {
  commit,
  del,
  insert,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { UrnService } from '../../../../lib/urn/index.js';
import {
  BAD_REQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND
} from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';

/**
 * POST /api/page-builder/changesets/:id/operations
 *
 * Body:
 *   {
 *     route: string,
 *     entity_urn: string,         // urn:evershop:cms:widget_instance:<uuid> | widget_placement
 *     old_payload: object | null,
 *     new_payload: object | null,
 *     change_order: int           // monotonic; client-allocated
 *   }
 *
 * Persists the operation row, advances this route's cursor in
 * `route_cursors`, and bumps `updated_at`. Returns the persisted row.
 * Phase 3a's contract stops here — preview data (per spec § 7.3.3) lands
 * in Phase 3b/3c when the admin UI consumes it.
 */
// 3-arg signature: with only 2 args `buildMiddlewareFunction` auto-calls
// next() after the handler resolves, which runs apiResponse on an
// already-sent response and trips ERR_HTTP_HEADERS_SENT. We send via
// `.json()` directly and deliberately do not invoke `_next`.
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

  const body = request.body ?? {};
  const errors: string[] = [];

  const route = typeof body.route === 'string' ? body.route : null;
  if (!route) errors.push('route is required');

  const entityUrn =
    typeof body.entity_urn === 'string' ? body.entity_urn : null;
  if (!entityUrn) {
    errors.push('entity_urn is required');
  } else if (!UrnService.isValid(entityUrn)) {
    errors.push(`entity_urn is not a registered URN: ${entityUrn}`);
  }

  const oldPayload =
    body.old_payload === undefined ? null : body.old_payload;
  const newPayload =
    body.new_payload === undefined ? null : body.new_payload;
  if (oldPayload == null && newPayload == null) {
    errors.push(
      'At least one of old_payload / new_payload must be set (op type must be inferable)'
    );
  }

  const changeOrder = Number(body.change_order);
  if (!Number.isInteger(changeOrder) || changeOrder < 0) {
    errors.push('change_order must be a non-negative integer');
  }

  if (errors.length > 0) {
    return response.status(BAD_REQUEST).json({
      error: { status: BAD_REQUEST, message: errors.join('; ') }
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
          message: 'Cannot add operations to a published changeset'
        }
      });
    }

    // --- Theme scope enforcement (spec 04 § 9.5, § 9.7) ---
    // The changeset's theme is authoritative; the editor never has to know
    // about theme because the server enforces it here, on the one endpoint
    // every page-builder write funnels through.
    //   - INSERT: stamp `changeset.theme` onto `new_payload`, overriding any
    //     client-supplied value (defence against buggy/malicious clients).
    //     The publish path materialises the row with this tag.
    //   - UPDATE / DELETE: the target source row must belong to the same
    //     theme. A cross-theme write is a 400 `theme scope violation`; the
    //     transaction rolls back and nothing is persisted.
    const changesetTheme = ((changeset as any).theme ?? null) as string | null;
    const parsedUrn = UrnService.parse(entityUrn as string);
    const URN_TABLE: Record<string, string> = {
      'cms:widget_instance': 'widget_instance',
      'cms:widget_placement': 'widget_placement'
    };
    const targetTable = URN_TABLE[`${parsedUrn.service}:${parsedUrn.type}`];

    if (oldPayload == null && newPayload != null) {
      if (typeof newPayload === 'object') {
        (newPayload as any).theme = changesetTheme;
      }
    } else if (oldPayload != null && targetTable) {
      const targetRow = await select()
        .from(targetTable)
        .where('uuid', '=', parsedUrn.uuid)
        .load(conn);
      if (
        targetRow &&
        (((targetRow as any).theme ?? null) as string | null) !== changesetTheme
      ) {
        await rollback(conn);
        return response.status(BAD_REQUEST).json({
          error: {
            status: BAD_REQUEST,
            message:
              `theme scope violation: changeset theme '${changesetTheme}', ` +
              `target row theme '${(targetRow as any).theme ?? null}'`
          }
        });
      }
    }

    // Per-route cursor model. Each route in `changeset.route_cursors` carries
    // its own "highest applied change_order" — undo/redo and redo-stack
    // truncation are scoped to a single route. `change_order` itself stays
    // globally monotonic across the whole changeset so storage order is
    // unambiguous; only the *applied window* is per-route.
    void changeOrder;
    const routeCursors =
      ((changeset as any).route_cursors as Record<string, number> | null) ?? {};
    const routeCursorOrder = Number(routeCursors[route] ?? 0);

    // Truncate this route's redo stack only. Ops on OTHER routes that happen
    // to sit past `routeCursorOrder` (e.g. user edited homepage at op 12,
    // then switched to cart and pressed Undo) stay alive.
    await del('changeset_operation')
      .where('changeset_id', '=', changesetId)
      .and('route', '=', route)
      .and('change_order', '>', routeCursorOrder)
      .execute(conn);

    // New change_order = max(existing) + 1 across the whole changeset, so the
    // storage order keeps a single timeline. Apply paths still split by
    // route_cursors when filtering "what's currently applied".
    const maxRow = await conn.query(
      `SELECT COALESCE(MAX(change_order), 0)::int AS max FROM changeset_operation WHERE changeset_id = $1`,
      [changesetId]
    );
    const newOrder = Number((maxRow.rows[0] as any)?.max ?? 0) + 1;

    const op = await insert('changeset_operation')
      .given({
        changeset_id: changesetId,
        route,
        entity_urn: entityUrn,
        old_payload: oldPayload,
        new_payload: newPayload,
        change_order: newOrder
      })
      .execute(conn);

    // Advance this route's cursor to the just-inserted op's order.
    const nextRouteCursors = { ...routeCursors, [route]: newOrder };
    await conn.query(
      `UPDATE changeset
         SET route_cursors = $1::jsonb,
             updated_at = NOW()
       WHERE changeset_id = $2`,
      [JSON.stringify(nextRouteCursors), changesetId]
    );

    await commit(conn);
    return response.status(CREATED).json({ data: op });
  } catch (e) {
    await rollback(conn);
    return response.status(INTERNAL_SERVER_ERROR).json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e instanceof Error ? e.message : 'Failed to add operation'
      }
    });
  }
};

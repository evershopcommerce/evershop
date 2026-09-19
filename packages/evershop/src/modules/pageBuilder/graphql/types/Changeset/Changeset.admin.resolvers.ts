import { select } from '@evershop/postgres-query-builder';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getActiveTheme } from '../../../../../lib/util/getActiveTheme.js';

export default {
  Query: {
    changeset: async (
      _: unknown,
      args: { id?: number; uuid?: string; token?: string },
      { pool }: any
    ) => {
      const query = select().from('changeset');
      if (args.id !== undefined) query.where('changeset_id', '=', args.id);
      else if (args.uuid !== undefined) query.where('uuid', '=', args.uuid);
      else if (args.token !== undefined) query.where('token', '=', args.token);
      else return null;
      const row = await query.load(pool);
      return row ? camelCase(row) : null;
    },

    changesets: async (_: unknown, __: unknown, ___: any) => {
      // Minimal stub for Phase 3a — returns all changesets without filters.
      // Full collection support (filters, paging) lands in Phase 3c.
      return {
        // Resolver-side fields below; query items via direct SELECT.
        currentPage: 1,
        currentFilters: []
      };
    }
  },

  ChangesetCollection: {
    // Theme isolation (spec 04 § 9.8): the changeset collection only lists
    // changesets belonging to the active theme. `theme IS NOT DISTINCT FROM`
    // matches the NULL bucket and isn't composable in the typed builder, so
    // these use raw queries.
    items: async (_root: any, _args: any, { pool }: any) => {
      const activeTheme = getActiveTheme();
      const result = await pool.query(
        `SELECT * FROM changeset WHERE theme IS NOT DISTINCT FROM $1`,
        [activeTheme]
      );
      return result.rows.map(camelCase);
    },
    total: async (_root: any, _args: any, { pool }: any) => {
      const activeTheme = getActiveTheme();
      const result = await pool.query(
        `SELECT COUNT(changeset_id)::int AS total
         FROM changeset WHERE theme IS NOT DISTINCT FROM $1`,
        [activeTheme]
      );
      return Number(result.rows[0]?.total ?? 0);
    }
  },

  Changeset: {
    operations: async (changeset: any, _args: any, { pool }: any) => {
      const query = select().from('changeset_operation');
      query.where('changeset_id', '=', changeset.changesetId);
      query.orderBy('change_order', 'asc');
      const rows = await query.execute(pool);
      return rows.map(camelCase);
    },
    routeCursors: (changeset: any) => {
      // Source row stores JSONB which the driver returns as a JS object
      // already. Defensive default to {} so the field never resolves to null.
      const v = changeset.routeCursors;
      if (v == null) return {};
      if (typeof v === 'string') {
        try {
          return JSON.parse(v);
        } catch {
          return {};
        }
      }
      return v;
    },
    canUndo: async (
      changeset: any,
      args: { route: string },
      { pool }: any
    ) => {
      const cursors =
        (typeof changeset.routeCursors === 'string'
          ? JSON.parse(changeset.routeCursors)
          : changeset.routeCursors) ?? {};
      const cursorOrder = Number(cursors[args.route] ?? 0);
      // Rollout-attached changesets: the rollout's snapshot cursor is the
      // floor. canUndo iff editor cursor strictly above floor on this route.
      // Draft changesets fall through with floor = 0, matching the previous
      // "cursorOrder > 0" semantics.
      const rolloutRow = await select('route_cursors')
        .from('rollout_plan')
        .where('changeset_id', '=', changeset.changesetId)
        .load(pool);
      const floor = rolloutRow
        ? Number(
            (
              (typeof (rolloutRow as any).route_cursors === 'string'
                ? JSON.parse((rolloutRow as any).route_cursors)
                : (rolloutRow as any).route_cursors) ?? {}
            )[args.route] ?? 0
          )
        : 0;
      if (cursorOrder <= floor) return false;
      const row = await select('changeset_operation_id')
        .from('changeset_operation')
        .where('changeset_id', '=', changeset.changesetId)
        .and('route', '=', args.route)
        .and('change_order', '<=', cursorOrder)
        .and('change_order', '>', floor)
        .load(pool);
      return !!row;
    },
    canRedo: async (
      changeset: any,
      args: { route: string },
      { pool }: any
    ) => {
      const cursors =
        (typeof changeset.routeCursors === 'string'
          ? JSON.parse(changeset.routeCursors)
          : changeset.routeCursors) ?? {};
      const cursorOrder = Number(cursors[args.route] ?? 0);
      const row = await select('changeset_operation_id')
        .from('changeset_operation')
        .where('changeset_id', '=', changeset.changesetId)
        .and('route', '=', args.route)
        .and('change_order', '>', cursorOrder)
        .load(pool);
      return !!row;
    },
    operationCountForRoute: async (
      changeset: any,
      args: { route: string },
      { pool }: any
    ) => {
      // "Pending" = ops a Discard / Revert would delete:
      //   - Draft mode (no rollout): every op on this route (Discard wipes
      //     the whole changeset). The subquery returns NULL → COALESCE to 0
      //     → `change_order > 0` includes everything.
      //   - Rollout mode: ops past the saved floor on this route. Anything
      //     at or below the floor is currently live on the storefront and
      //     stays put after a Revert.
      const result = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM changeset_operation
         WHERE changeset_id = $1
           AND route = $2
           AND change_order > COALESCE(
             ((SELECT route_cursors
                 FROM rollout_plan
                WHERE changeset_id = $1
                LIMIT 1) ->> $2)::int,
             0
           )`,
        [changeset.changesetId, args.route]
      );
      return Number((result.rows[0] as any)?.count ?? 0);
    },
    operationCountsByRoute: async (
      changeset: any,
      _args: any,
      { pool }: any
    ) => {
      // Same per-route "pending" semantic as `operationCountForRoute`, but
      // grouped. The inline `route_cursors` subquery returns NULL for
      // drafts → COALESCE to 0 → every op counts. For rollouts the floor
      // is the per-route saved cursor. Subquery (not LEFT JOIN) so an
      // edge-case "two rollouts on one changeset" can't double-count.
      const result = await pool.query(
        `SELECT op.route, COUNT(*)::int AS count
         FROM changeset_operation op
         WHERE op.changeset_id = $1
           AND op.change_order > COALESCE(
             ((SELECT route_cursors
                 FROM rollout_plan
                WHERE changeset_id = $1
                LIMIT 1) ->> op.route)::int,
             0
           )
         GROUP BY op.route
         ORDER BY count DESC, op.route ASC`,
        [changeset.changesetId]
      );
      return result.rows.map((r: any) => ({
        route: r.route,
        count: Number(r.count)
      }));
    },
    rolloutPlan: async (changeset: any, _args: any, { pool }: any) => {
      const row = await select()
        .from('rollout_plan')
        .where('changeset_id', '=', changeset.changesetId)
        .load(pool);
      return row ? camelCase(row) : null;
    }
  }
};

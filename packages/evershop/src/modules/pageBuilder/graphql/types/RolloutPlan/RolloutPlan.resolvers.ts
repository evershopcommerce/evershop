import { select } from '@evershop/postgres-query-builder';
import { pool as defaultPool } from '../../../../../lib/postgres/connection.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getActiveTheme } from '../../../../../lib/util/getActiveTheme.js';

// Theme isolation (spec 04 § 9.8): every rollout query is scoped to the
// currently-active theme so the SessionPicker and rollout pages never surface
// another theme's rollouts. `theme IS NOT DISTINCT FROM $n` matches the NULL
// bucket; the typed builder doesn't compose that operator, so these drop to
// raw `pool.query`.
export default {
  Query: {
    rolloutPlan: async (
      _: unknown,
      args: { id?: number; uuid?: string },
      { pool }: any
    ) => {
      const conn = pool || defaultPool;
      const activeTheme = getActiveTheme();
      let result;
      if (args.id !== undefined) {
        result = await conn.query(
          `SELECT * FROM rollout_plan
           WHERE rollout_plan_id = $1 AND theme IS NOT DISTINCT FROM $2`,
          [args.id, activeTheme]
        );
      } else if (args.uuid !== undefined) {
        result = await conn.query(
          `SELECT * FROM rollout_plan
           WHERE uuid = $1 AND theme IS NOT DISTINCT FROM $2`,
          [args.uuid, activeTheme]
        );
      } else {
        return null;
      }
      const row = result.rows[0];
      return row ? camelCase(row) : null;
    },

    rolloutPlans: async (_: unknown, __: unknown, { pool }: any) => {
      const conn = pool || defaultPool;
      const activeTheme = getActiveTheme();
      const result = await conn.query(
        `SELECT * FROM rollout_plan
         WHERE theme IS NOT DISTINCT FROM $1
         ORDER BY start_time DESC`,
        [activeTheme]
      );
      return result.rows.map(camelCase);
    },

    activeRolloutPlans: async (_: unknown, __: unknown, { pool }: any) => {
      const conn = pool || defaultPool;
      const activeTheme = getActiveTheme();
      // start_time <= NOW() AND (end_time IS NULL OR end_time > NOW())
      const result = await conn.query(
        `SELECT * FROM rollout_plan
         WHERE start_time <= NOW()
           AND (end_time IS NULL OR end_time > NOW())
           AND theme IS NOT DISTINCT FROM $1
         ORDER BY start_time ASC`,
        [activeTheme]
      );
      return result.rows.map(camelCase);
    }
  },

  RolloutPlan: {
    routeCursors: (rolloutPlan: any) => {
      // JSONB returns as a JS object via node-postgres; defensive parse for
      // the string case (mirrors Changeset.routeCursors resolver).
      const v = rolloutPlan.routeCursors;
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
    changeset: async (rolloutPlan: any, _args: any, { pool }: any) => {
      const row = await select()
        .from('changeset')
        .where('changeset_id', '=', rolloutPlan.changesetId)
        .load(pool);
      return row ? camelCase(row) : null;
    }
  }
};

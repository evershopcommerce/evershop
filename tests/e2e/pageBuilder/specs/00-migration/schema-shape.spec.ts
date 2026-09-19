import { expect, test } from '@playwright/test';
import { getDb } from '../../../shared/db.js';

/**
 * Phase 1 migration sanity — verify the schema changes from
 * `Version-1.1.0.ts` landed in the dev DB.
 *
 * Doesn't replay the migration (Playwright runs against a live dev server
 * which applied the migration on startup). Just confirms the post-state.
 */
test.describe('migration / schema shape', () => {
  test('theme columns exist on all four tables', async () => {
    const db = getDb();
    const expected: Array<[string, string]> = [
      ['widget_instance', 'theme'],
      ['widget_placement', 'theme'],
      ['changeset', 'theme'],
      ['rollout_plan', 'theme']
    ];
    for (const [table, column] of expected) {
      const { rows } = await db.query<{ data_type: string; is_nullable: string }>(
        `SELECT data_type, is_nullable
         FROM information_schema.columns
         WHERE table_name = $1 AND column_name = $2`,
        [table, column]
      );
      expect(rows, `${table}.${column} should exist`).toHaveLength(1);
      expect(rows[0].data_type).toBe('text');
      expect(rows[0].is_nullable).toBe('YES');
    }
  });

  test('theme indexes exist with expected shape', async () => {
    const db = getDb();
    const expected = [
      'idx_widget_instance_theme',
      'idx_widget_placement_theme_route',
      'idx_rollout_plan_theme',
      'idx_changeset_user_theme_open'
    ];
    const { rows } = await db.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes
       WHERE indexname = ANY($1::text[])`,
      [expected]
    );
    const found = new Set(rows.map((r) => r.indexname));
    for (const name of expected) {
      expect(found.has(name), `${name} should exist`).toBe(true);
    }
  });

  test('changeset unique index is draft-scoped + COALESCEs the NULL bucket', async () => {
    const db = getDb();
    const { rows } = await db.query<{ indexdef: string }>(
      `SELECT indexdef FROM pg_indexes
       WHERE indexname = 'idx_changeset_user_theme_open'`
    );
    expect(rows).toHaveLength(1);
    const def = rows[0].indexdef.toLowerCase();
    // COALESCE keeps the NULL theme bucket unique (a plain UNIQUE index
    // treats NULL = NULL as distinct).
    expect(def).toContain('coalesce');
    // Partial on open rows...
    expect(def).toContain('published_at is null');
    // ...and only *draft* rows. A rollout-backed changeset stays open under
    // the same admin but must not occupy the draft bucket, else the admin
    // could never get a fresh pb-draft after scheduling a rollout. See
    // getOrCreateDraftChangeset + Version-1.1.0 step 4b.
    expect(def).toContain("'pb-draft-%'");
  });

  test('theme_install_state and theme_install_log tables exist', async () => {
    const db = getDb();
    const { rows } = await db.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_name IN ('theme_install_state', 'theme_install_log')`
    );
    const names = new Set(rows.map((r) => r.table_name));
    expect(names.has('theme_install_state')).toBe(true);
    expect(names.has('theme_install_log')).toBe(true);
  });
});

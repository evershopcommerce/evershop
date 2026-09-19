import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';
import { getConfig } from '../../../lib/util/getConfig.js';

/**
 * Phase 3b — Theme widget distribution (Phase 1 of the implementation plan,
 * see `specifications/04-theme-widget-distribution-implementation-plan.md`).
 *
 * Adds theme tagging to `widget_instance`, `widget_placement`, `changeset`,
 * `rollout_plan`. Introduces `theme_install_state` and `theme_install_log`
 * tables. Backfills the new theme columns from `config.system.theme` so
 * existing widgets continue rendering under the merchant's currently-active
 * theme.
 *
 * Per spec 04 § 4 + § 10. The migration is invisible to merchants who don't
 * subsequently install a manifest-shipping theme.
 *
 * Aborts BEFORE any schema change if `config.system.theme` is set to a value
 * that doesn't match the new theme ID rules (lowercase ASCII, 1–64 chars,
 * starts with letter or digit, contains only letters/digits/hyphen/
 * underscore). Aborting is safer than silently coercing — silent
 * `toLowerCase()` would desync from any case-sensitive build artifact, and
 * we can't assume the merchant's filesystem case sensitivity.
 */
const THEME_ID_REGEX = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export default async (connection: PoolClient): Promise<void> => {
  // 1. Pre-flight: validate config.system.theme before touching the schema.
  //    No transaction wraps the pre-flight; aborting here leaves a
  //    completely untouched DB.
  const currentTheme =
    (getConfig('system.theme') as string | undefined) ?? null;
  if (currentTheme !== null && !THEME_ID_REGEX.test(currentTheme)) {
    throw new Error(
      `Cannot migrate: config.system.theme = '${currentTheme}' is not a valid theme ID ` +
        `under the new naming rules (lowercase ASCII, letters/digits/hyphen/underscore, ` +
        `1–64 chars, must start with a letter or digit). Rename your theme directory and ` +
        `update config.system.theme to a conforming value, then re-run the migration.`
    );
  }

  // 2. Schema additions — theme columns on existing tables.
  await execute(connection, `ALTER TABLE widget_instance  ADD COLUMN theme TEXT NULL`);
  await execute(connection, `ALTER TABLE widget_placement ADD COLUMN theme TEXT NULL`);
  await execute(connection, `ALTER TABLE changeset        ADD COLUMN theme TEXT NULL`);
  await execute(connection, `ALTER TABLE rollout_plan     ADD COLUMN theme TEXT NULL`);

  // 3. Indexes for the read-side filter hot paths.
  //    - widget_placement(theme, route): storefront placement query
  //    - widget_instance(theme): admin listings + integrity checks
  //    - rollout_plan(theme): loadActiveOps rollout filter
  //    The changeset partial unique index is created in step 4b (after
  //    the duplicate-drafts cleanup in step 4a).
  await execute(connection, `CREATE INDEX idx_widget_instance_theme ON widget_instance(theme)`);
  await execute(connection, `CREATE INDEX idx_widget_placement_theme_route ON widget_placement(theme, route)`);
  await execute(connection, `CREATE INDEX idx_rollout_plan_theme ON rollout_plan(theme)`);

  // 4a. Proactive cleanup of duplicate open drafts. The new partial
  //     unique index in step 4b would otherwise fail on any install
  //     that has more than one open draft for the same admin under the
  //     same theme bucket — possible via a race in the v1.0.0
  //     application-side enforcement. Close all but the most recently
  //     updated draft per `(created_by, COALESCE(theme, ''))` group;
  //     no data is deleted (closed drafts remain queryable with
  //     `published_at != NULL`).
  //
  //     Scoped to `name LIKE 'pb-draft-%'` to match the index in 4b: only
  //     genuine draft rows are deduped. A rollout-backed changeset is kept
  //     open on purpose (so it stays editable via `?session`) and is NOT a
  //     draft, so it must never be force-closed here.
  await execute(
    connection,
    `WITH duplicates AS (
       SELECT changeset_id,
              ROW_NUMBER() OVER (
                PARTITION BY created_by, COALESCE(theme, '')
                ORDER BY updated_at DESC, changeset_id DESC
              ) AS rn
       FROM changeset
       WHERE published_at IS NULL
         AND name LIKE 'pb-draft-%'
     )
     UPDATE changeset
        SET published_at = NOW()
      WHERE changeset_id IN (SELECT changeset_id FROM duplicates WHERE rn > 1)`
  );

  // 4b. New partial unique index enforcing "one open DRAFT per
  //     (created_by, theme)". COALESCE is required because Postgres treats
  //     NULL = NULL as distinct in UNIQUE indexes by default; without it,
  //     the NULL theme bucket wouldn't enforce uniqueness for merchants
  //     running with no custom theme. Empty string is reserved by spec 04
  //     § 6.1 (theme ID regex requires non-empty starting with letter/
  //     digit), so it can't collide with a real theme ID.
  //
  //     The predicate is scoped to `name LIKE 'pb-draft-%'`, NOT all open
  //     changesets. A rollout-backed changeset stays open on purpose (it
  //     must remain editable via `?session` until the rollout fires) and
  //     lives under the same `created_by`. If the index covered every open
  //     row, that rollout-backed changeset would permanently occupy the
  //     admin's draft bucket, so `getOrCreateDraftChangeset` could never
  //     mint a fresh `pb-draft-<id>` after the admin schedules a rollout —
  //     locking them into rollout-edit mode. Restricting to draft rows
  //     keeps the "one open draft" guarantee while letting drafts and
  //     rollout-backed changesets coexist for the same admin. `LIKE` with a
  //     constant pattern is immutable, so it's valid in a partial-index
  //     predicate.
  //
  //     Defensive DROP first in case a previous migration attempt left
  //     a stale index.
  await execute(
    connection,
    `DROP INDEX IF EXISTS idx_changeset_user_theme_open`
  );
  await execute(
    connection,
    `CREATE UNIQUE INDEX idx_changeset_user_theme_open
       ON changeset(created_by, COALESCE(theme, ''))
       WHERE published_at IS NULL AND name LIKE 'pb-draft-%'`
  );

  // 5. Backfill theme columns from config.system.theme. After this step:
  //    - A merchant currently on a custom theme: every row tagged with
  //      that theme name. Storefront filter matches, content keeps
  //      rendering.
  //    - A merchant on no custom theme (NULL): every row stays NULL.
  //      Filter IS NOT DISTINCT FROM NULL matches NULL rows.
  //    Either way the migration is invisible to existing installs.
  //
  //    Uses connection.query() instead of execute() because the
  //    postgres-query-builder `execute()` helper only forwards the SQL
  //    string, not the parameter array — verified against v1.0.0 usage.
  //    PoolClient.query() takes (text, params) natively.
  await connection.query(
    `UPDATE widget_instance  SET theme = $1 WHERE theme IS NULL`,
    [currentTheme]
  );
  await connection.query(
    `UPDATE widget_placement SET theme = $1 WHERE theme IS NULL`,
    [currentTheme]
  );
  await connection.query(
    `UPDATE changeset        SET theme = $1 WHERE theme IS NULL`,
    [currentTheme]
  );
  await connection.query(
    `UPDATE rollout_plan     SET theme = $1 WHERE theme IS NULL`,
    [currentTheme]
  );

  // 6. New tables for the theme-install pipeline (Phase 3 will use them).
  //    Schemas verbatim from spec 04 § 4.5, § 4.6.
  await execute(
    connection,
    `CREATE TABLE theme_install_state (
       theme         TEXT PRIMARY KEY,
       snapshot      JSONB NOT NULL,
       installed_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`
  );

  await execute(
    connection,
    `CREATE TABLE theme_install_log (
       log_id              INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
       theme               TEXT NOT NULL,
       command             TEXT NOT NULL,
       widgets_added       INT NOT NULL DEFAULT 0,
       widgets_updated     INT NOT NULL DEFAULT 0,
       widgets_removed     INT NOT NULL DEFAULT 0,
       placements_added    INT NOT NULL DEFAULT 0,
       placements_updated  INT NOT NULL DEFAULT 0,
       placements_removed  INT NOT NULL DEFAULT 0,
       conflicts           INT NOT NULL DEFAULT 0,
       conflicts_detail    JSONB NOT NULL DEFAULT '[]'::jsonb,
       notes               TEXT NULL,
       applied_by          TEXT NULL,
       applied_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`
  );
};

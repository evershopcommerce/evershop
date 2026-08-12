import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { getDb } from '../../../shared/db.js';

/**
 * Phase 1 — storefront + rollout overlay theme filtering.
 *
 * The dev server runs with no custom theme (`config.system.theme = NULL`),
 * so `getActiveTheme()` returns `null` and the storefront filter is
 * `theme IS NOT DISTINCT FROM NULL` — only NULL-tagged rows render.
 *
 * Strategy: seed two widgets per test (one tagged NULL, one tagged with a
 * named theme), assert only the NULL-tagged one appears in the rendered
 * HTML. The named-bucket case is invisible at NULL, which is the strict-
 * bucketing guarantee — switching the global active theme to that name
 * would invert the visibility, but we can't mutate config.system.theme
 * mid-test without restarting the dev server. The symmetry of
 * `IS NOT DISTINCT FROM` guarantees the inverse holds.
 *
 * Same shape for rollouts: seed two rollouts within an active window
 * (one NULL, one named), assert only the NULL-tagged one's ops surface
 * in the storefront overlay.
 *
 * Markers are per-run unique CSS classes so we never collide with pre-
 * existing dev-DB content.
 */
test.describe('rendering / theme bucket isolation', () => {
  test.beforeEach(async () => {
    const db = getDb();
    // Sweep any leftover state from previous runs of this spec.
    // Order matters: rollouts first (FK), then changesets, then widgets.
    await db.query(`DELETE FROM rollout_plan WHERE name LIKE 'e2e-bucket-rollout-%'`);
    await db.query(`DELETE FROM changeset WHERE name LIKE 'e2e-bucket-rollout-%'`);
    await db.query(`DELETE FROM widget_instance WHERE name LIKE 'e2e-bucket-%'`);

    // Also close any open changeset this admin accumulated from previous
    // specs (header.spec, sidebar.spec, etc. all call editor.open(), which
    // mints a pb-draft-<adminUserId> changeset). This spec seeds its own
    // rows directly, so clearing the admin's open changesets keeps each run
    // starting from a clean slate. Closing with published_at = NOW() is safe
    // — the rows stay queryable; the draft-scoped partial index just stops
    // tracking them. (The index only constrains `pb-draft-%` rows, so it
    // wouldn't reject this spec's closed fixtures anyway — this is hygiene,
    // not a collision workaround.)
    const adminMeta = JSON.parse(
      (
        await import('node:fs')
      ).readFileSync(
        (await import('node:path')).join(
          (await import('node:path')).dirname(
            (await import('node:url')).fileURLToPath(import.meta.url)
          ),
          '..',
          '..',
          '..',
          '.auth',
          'admin.meta.json'
        ),
        'utf8'
      )
    ) as { adminUserId: number };
    await db.query(
      `UPDATE changeset SET published_at = NOW()
       WHERE created_by = $1 AND published_at IS NULL`,
      [adminMeta.adminUserId]
    );
  });

  test('storefront filter: NULL-bucket renders, named-bucket dormant', async ({
    request
  }) => {
    const db = getDb();
    const nullMarker = `e2e-bucket-null-${randomUUID()}`;
    const namedMarker = `e2e-bucket-named-${randomUUID()}`;
    const namedTheme = `e2e-other-${randomUUID().slice(0, 8)}`;

    // Two text_block widgets — one NULL-themed (visible), one tagged for
    // a dormant theme (invisible).
    await db.query(
      `INSERT INTO widget_instance (uuid, name, type, settings, status, theme)
       VALUES ($1, 'e2e-bucket-null', 'text_block', $2::jsonb, TRUE, NULL),
              ($3, 'e2e-bucket-named', 'text_block', $4::jsonb, TRUE, $5)`,
      [
        randomUUID(),
        JSON.stringify({ className: nullMarker, text: '[]' }),
        randomUUID(),
        JSON.stringify({ className: namedMarker, text: '[]' }),
        namedTheme
      ]
    );
    const widgetRows = await db.query<{ widget_instance_id: number; theme: string | null }>(
      `SELECT widget_instance_id, theme FROM widget_instance
       WHERE name IN ('e2e-bucket-null', 'e2e-bucket-named')`
    );
    const nullWidget = widgetRows.rows.find((r) => r.theme === null)!;
    const namedWidget = widgetRows.rows.find((r) => r.theme === namedTheme)!;

    // Both placements on homepage/content. Same theme tag as their
    // widget_instance per § 4.2's denormalization invariant.
    await db.query(
      `INSERT INTO widget_placement (uuid, widget_instance_id, route, area, sort_order, theme)
       VALUES ($1, $2, 'homepage', 'content', 1000, NULL),
              ($3, $4, 'homepage', 'content', 1001, $5)`,
      [
        randomUUID(),
        nullWidget.widget_instance_id,
        randomUUID(),
        namedWidget.widget_instance_id,
        namedTheme
      ]
    );

    const res = await request.get('/');
    expect(res.ok()).toBe(true);
    const html = await res.text();

    // NULL-tagged widget renders. Named-tagged widget is invisible.
    expect(html).toContain(nullMarker);
    expect(html).not.toContain(namedMarker);
  });

  test('rollout overlay: NULL-bucket fires, named-bucket dormant', async ({
    request
  }) => {
    const db = getDb();
    const adminUserId = (
      await db.query<{ admin_user_id: number }>(
        `SELECT admin_user_id FROM admin_user
         WHERE email LIKE 'e2e-%' LIMIT 1`
      )
    ).rows[0].admin_user_id;

    const nullMarker = `e2e-rollout-null-${randomUUID()}`;
    const namedMarker = `e2e-rollout-named-${randomUUID()}`;
    const namedTheme = `e2e-other-${randomUUID().slice(0, 8)}`;

    // Helper: build a complete changeset with one text_block INSERT op
    // + placement INSERT op, both targeting route='all'. Returns the
    // changeset id and the cursor value to seal in the rollout.
    //
    // The changeset's `theme` matches the bucket the test is exercising.
    // Required because the new `idx_changeset_user_theme_open` partial
    // unique index rejects two open changesets with the same
    // `(created_by, COALESCE(theme, ''))` pair — Phase 2 will inherit
    // theme on rollout creation, but for this Phase 1 test we stamp the
    // changeset directly to model the same invariant. Also stamps the
    // op rows' placement payload theme to match (denormalized invariant).
    const makeChangeset = async (
      label: string,
      theme: string | null
    ): Promise<{ id: number }> => {
      // Stamp published_at so the row doesn't sit in the open-draft
      // bucket — the new `idx_changeset_user_theme_open` partial unique
      // index would otherwise collide with the admin's `pb-draft-*` open
      // draft (same theme, same admin). loadActiveOps's rollout query
      // doesn't care about changeset.published_at — it joins through
      // rollout_plan and reads rp.route_cursors — so the rollout still
      // fires for this changeset.
      const cs = await db.query<{ changeset_id: number }>(
        `INSERT INTO changeset (name, route_cursors, token, created_by, theme, published_at)
         VALUES ($1, $2::jsonb, $3, $4, $5, NOW())
         RETURNING changeset_id`,
        [
          `e2e-bucket-rollout-${label}`,
          JSON.stringify({ all: 2 }),
          randomUUID(),
          adminUserId,
          theme
        ]
      );
      const csId = cs.rows[0].changeset_id;
      const widgetUuid = randomUUID();
      const placementUuid = randomUUID();
      const marker = label === 'null' ? nullMarker : namedMarker;
      await db.query(
        `INSERT INTO changeset_operation (changeset_id, route, entity_urn, old_payload, new_payload, change_order)
         VALUES ($1, 'all', $2, NULL, $3::jsonb, 1)`,
        [
          csId,
          `urn:evershop:cms:widget_instance:${widgetUuid}`,
          JSON.stringify({
            uuid: widgetUuid,
            type: 'text_block',
            name: `e2e-bucket-rollout-${label}`,
            settings: { className: marker, text: '[]' },
            status: true
          })
        ]
      );
      await db.query(
        `INSERT INTO changeset_operation (changeset_id, route, entity_urn, old_payload, new_payload, change_order)
         VALUES ($1, 'all', $2, NULL, $3::jsonb, 2)`,
        [
          csId,
          `urn:evershop:cms:widget_placement:${placementUuid}`,
          JSON.stringify({
            uuid: placementUuid,
            widget_instance_uuid: widgetUuid,
            route: 'all',
            area: 'content',
            sort_order: 1100,
            entity_urn: null
          })
        ]
      );
      return { id: csId };
    };

    const nullCs = await makeChangeset('null', null);
    const namedCs = await makeChangeset('named', namedTheme);

    // Two active rollouts (start in the past, no end). One NULL-themed,
    // one tagged for the dormant theme.
    await db.query(
      `INSERT INTO rollout_plan (name, changeset_id, route_cursors, start_time, end_time, theme)
       VALUES ($1, $2, $3::jsonb, NOW() - INTERVAL '1 hour', NULL, NULL),
              ($4, $5, $6::jsonb, NOW() - INTERVAL '1 hour', NULL, $7)`,
      [
        `e2e-bucket-rollout-null-${randomUUID().slice(0, 8)}`,
        nullCs.id,
        JSON.stringify({ all: 2 }),
        `e2e-bucket-rollout-named-${randomUUID().slice(0, 8)}`,
        namedCs.id,
        JSON.stringify({ all: 2 }),
        namedTheme
      ]
    );

    const res = await request.get('/');
    expect(res.ok()).toBe(true);
    const html = await res.text();

    // NULL-themed rollout overlays its widget. Named-themed rollout does not.
    expect(html).toContain(nullMarker);
    expect(html).not.toContain(namedMarker);

    // Cleanup
    await db.query(
      `DELETE FROM rollout_plan WHERE name LIKE 'e2e-bucket-rollout-%'`
    );
    await db.query(
      `DELETE FROM changeset WHERE name LIKE 'e2e-bucket-rollout-%'`
    );
  });
});

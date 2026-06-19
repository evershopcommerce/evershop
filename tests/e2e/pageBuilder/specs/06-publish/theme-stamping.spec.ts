import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { loadAdminUserId } from '../../../shared/adminMeta.js';
import {
  insertThemedChangeset,
  readOpNewPayloadTheme,
  readWidgetInstanceTheme,
  readWidgetPlacementTheme
} from '../../../shared/changesetDb.js';
import {
  cleanupTestRolloutPlans,
  cleanupTestWidgets,
  discardAdminChangesets,
  getDb
} from '../../../shared/db.js';
import { postChangesetOperation, seedWidgetPlacement } from '../../../shared/pbApi.js';

/**
 * Phase 2 — theme stamping on the write + publish paths (spec 04 § 9.5,
 * § 9.7, § 9.9). The dev server runs with `config.system.theme = null`, so
 * we seed changesets with an explicit theme directly and drive the REST API
 * against them.
 */
test.describe('theme / stamping + publish', () => {
  const adminUserId = loadAdminUserId();

  test.beforeEach(async () => {
    await discardAdminChangesets(adminUserId);
    await cleanupTestRolloutPlans();
    await cleanupTestWidgets();
  });

  test('REST stamps changeset.theme onto INSERT ops, overriding client value', async ({
    request
  }) => {
    const { changesetId } = await insertThemedChangeset({
      adminUserId,
      theme: 'e2e-stamp'
    });
    const widgetUuid = randomUUID();
    // Client lies about the theme — server must override with changeset.theme.
    await postChangesetOperation(request, changesetId, {
      route: 'homepage',
      entity_urn: `urn:evershop:cms:widget_instance:${widgetUuid}`,
      old_payload: null,
      new_payload: {
        uuid: widgetUuid,
        type: 'text_block',
        name: 'e2e-stamp-widget',
        settings: {},
        status: true,
        theme: 'CLIENT-SUPPLIED-EVIL'
      },
      change_order: 1
    });

    const stamped = await readOpNewPayloadTheme(
      changesetId,
      'urn:evershop:cms:widget_instance:'
    );
    expect(stamped).toBe('e2e-stamp');
  });

  test('publish stamps changeset.theme onto source widget_instance + widget_placement', async ({
    request
  }) => {
    const { changesetId } = await insertThemedChangeset({
      adminUserId,
      theme: 'e2e-pub'
    });
    const { widgetUuid, placementUuid } = await seedWidgetPlacement(request, {
      changesetId,
      route: 'homepage',
      placementRoute: 'homepage',
      area: 'content',
      widgetType: 'text_block'
    });

    const res = await request.post(
      `/api/page-builder/changesets/${changesetId}/publish`
    );
    expect(res.ok()).toBe(true);

    expect(await readWidgetInstanceTheme(widgetUuid)).toBe('e2e-pub');
    expect(await readWidgetPlacementTheme(placementUuid)).toBe('e2e-pub');
  });

  test('publish rolls back when an op targets a row retagged to another theme', async ({
    request
  }) => {
    const db = getDb();
    // A widget already lives in source, tagged for a different theme.
    const widgetUuid = randomUUID();
    await db.query(
      `INSERT INTO widget_instance (uuid, name, type, settings, status, theme)
       VALUES ($1, 'e2e-stale-widget', 'text_block', $2::jsonb, TRUE, 'other-theme')`,
      [widgetUuid, JSON.stringify({ className: 'original' })]
    );

    // A NULL-theme changeset holds a *stale* UPDATE op against it. Inserted
    // directly to bypass the REST cross-theme guard (which would reject it
    // at POST time) — this models a UUID retagged after the op was recorded.
    const { changesetId } = await insertThemedChangeset({
      adminUserId,
      theme: null
    });
    await db.query(
      `INSERT INTO changeset_operation
         (changeset_id, route, entity_urn, old_payload, new_payload, change_order)
       VALUES ($1, 'homepage', $2, $3::jsonb, $4::jsonb, 1)`,
      [
        changesetId,
        `urn:evershop:cms:widget_instance:${widgetUuid}`,
        JSON.stringify({ uuid: widgetUuid }),
        JSON.stringify({ uuid: widgetUuid, settings: { className: 'hacked' } })
      ]
    );
    // Put the op in the applied window so publish walks it.
    await db.query(
      `UPDATE changeset SET route_cursors = '{"homepage":1}'::jsonb WHERE changeset_id = $1`,
      [changesetId]
    );

    const res = await request.post(
      `/api/page-builder/changesets/${changesetId}/publish`
    );
    expect(res.status()).toBe(500); // theme scope violation → throw → 500

    // Rolled back: widget untouched, changeset not published.
    const after = await db.query<{ settings: any; theme: string }>(
      `SELECT settings, theme FROM widget_instance WHERE uuid = $1`,
      [widgetUuid]
    );
    expect(after.rows[0].theme).toBe('other-theme');
    expect(after.rows[0].settings.className).toBe('original');
    const cs = await db.query<{ published_at: string | null }>(
      `SELECT published_at FROM changeset WHERE changeset_id = $1`,
      [changesetId]
    );
    expect(cs.rows[0].published_at).toBeNull();
  });
});

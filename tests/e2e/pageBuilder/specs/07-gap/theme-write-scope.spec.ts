import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { loadAdminUserId } from '../../../shared/adminMeta.js';
import {
  countOperations,
  insertThemedChangeset,
  readOpNewPayloadTheme
} from '../../../shared/changesetDb.js';
import {
  cleanupTestWidgets,
  discardAdminChangesets,
  getDb
} from '../../../shared/db.js';
import { postChangesetOperation } from '../../../shared/pbApi.js';

/**
 * Phase 2 — the sticky-theme contract + cross-theme write rejection +
 * draft uniqueness (spec 04 § 9.5, § 9.7, § 11.4). Active theme is NULL on
 * the dev server, so a changeset seeded with a non-NULL theme models "the
 * global theme changed after the draft was created".
 */
test.describe('theme / write scope', () => {
  const adminUserId = loadAdminUserId();

  test.beforeEach(async () => {
    await discardAdminChangesets(adminUserId);
    await cleanupTestWidgets();
  });

  test('INSERT op inherits changeset.theme, not the global active theme', async ({
    request
  }) => {
    // changeset.theme ('e2e-sticky') differs from the global active theme
    // (NULL) — the § 11.4 worked scenario. The stamped op must carry the
    // changeset's theme, proving the server reads changeset.theme and not the
    // current global config.
    const { changesetId } = await insertThemedChangeset({
      adminUserId,
      theme: 'e2e-sticky'
    });
    const widgetUuid = randomUUID();
    await postChangesetOperation(request, changesetId, {
      route: 'homepage',
      entity_urn: `urn:evershop:cms:widget_instance:${widgetUuid}`,
      old_payload: null,
      new_payload: {
        uuid: widgetUuid,
        type: 'text_block',
        name: 'e2e-sticky-widget',
        settings: {},
        status: true
      },
      change_order: 1
    });

    expect(
      await readOpNewPayloadTheme(
        changesetId,
        'urn:evershop:cms:widget_instance:'
      )
    ).toBe('e2e-sticky');
  });

  test('UPDATE op against a row of a different theme is rejected (400)', async ({
    request
  }) => {
    const db = getDb();
    // A widget lives in source under theme 'theme-a'.
    const widgetUuid = randomUUID();
    await db.query(
      `INSERT INTO widget_instance (uuid, name, type, settings, status, theme)
       VALUES ($1, 'e2e-foreign-widget', 'text_block', '{}'::jsonb, TRUE, 'theme-a')`,
      [widgetUuid]
    );

    // A NULL-theme changeset tries to UPDATE it — cross-theme write.
    const { changesetId } = await insertThemedChangeset({
      adminUserId,
      theme: null
    });
    const res = await request.post(
      `/api/page-builder/changesets/${changesetId}/operations`,
      {
        data: {
          route: 'homepage',
          entity_urn: `urn:evershop:cms:widget_instance:${widgetUuid}`,
          old_payload: { uuid: widgetUuid },
          new_payload: { uuid: widgetUuid, settings: { className: 'x' } },
          change_order: 1
        },
        headers: { 'Content-Type': 'application/json' }
      }
    );

    expect(res.status()).toBe(400);
    expect(JSON.stringify(await res.json())).toContain('theme scope violation');
    // Nothing persisted — the transaction rolled back.
    expect(await countOperations(changesetId)).toBe(0);
  });

  test('concurrent draft creation collapses to one (draft-scoped unique index, NULL bucket)', async ({
    request
  }) => {
    // beforeEach cleared the admin's open changesets. Fire two editor entries
    // concurrently — both run getOrCreateDraftChangeset; the partial unique
    // index `idx_changeset_user_theme_open` (COALESCE(theme,'') = '' here)
    // rejects the second INSERT, and the catch returns the first draft.
    const editorUrl = '/admin/page-builder/edit/homepage';
    await Promise.all([request.get(editorUrl), request.get(editorUrl)]);

    const db = getDb();
    const { rows } = await db.query(
      `SELECT changeset_id FROM changeset
       WHERE created_by = $1 AND name = $2 AND published_at IS NULL
         AND theme IS NULL`,
      [adminUserId, `pb-draft-${adminUserId}`]
    );
    expect(rows).toHaveLength(1);
  });
});

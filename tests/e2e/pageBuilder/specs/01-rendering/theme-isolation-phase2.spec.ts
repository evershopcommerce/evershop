import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { loadAdminUserId } from '../../../shared/adminMeta.js';
import {
  insertThemedChangeset,
  readWidgetInstanceTheme
} from '../../../shared/changesetDb.js';
import {
  cleanupTestWidgets,
  discardAdminChangesets,
  getDb
} from '../../../shared/db.js';
import { seedWidgetPlacement } from '../../../shared/pbApi.js';

/**
 * Phase 2 — theme isolation across the GraphQL changeset listing and the
 * publish path (spec 04 § 9.8, § 11.2). Active theme is NULL on the dev
 * server; rows seeded under another theme must stay invisible / untouched.
 */
test.describe('rendering / theme isolation (phase 2)', () => {
  const adminUserId = loadAdminUserId();

  test.beforeEach(async () => {
    await discardAdminChangesets(adminUserId);
    await cleanupTestWidgets();
  });

  test('changesets GraphQL collection is scoped to the active theme', async ({
    request
  }) => {
    const nullName = `e2e-csfilter-null-${Date.now()}`;
    const namedName = `e2e-csfilter-named-${Date.now()}`;
    await insertThemedChangeset({ adminUserId, theme: null, name: nullName });
    await insertThemedChangeset({
      adminUserId,
      theme: 'cs-hidden-theme',
      name: namedName
    });

    const res = await request.post('/api/admin/graphql', {
      data: { query: '{ changesets { items { name } } }' },
      headers: { 'Content-Type': 'application/json' }
    });
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as {
      data: { changesets: { items: Array<{ name: string }> } };
    };
    const names = body.data.changesets.items.map((i) => i.name);
    expect(names).toContain(nullName); // active (NULL) bucket → listed
    expect(names).not.toContain(namedName); // other theme → filtered out
  });

  test('a NULL-theme publish leaves a foreign-theme widget untouched', async ({
    request
  }) => {
    const db = getDb();
    // A widget already lives in source under theme 'theme-a' (think: created
    // while theme-a was active). It must survive — unchanged — a publish that
    // happens under the NULL theme. This is the § 11.2 round-trip guarantee:
    // activity in one theme bucket never disturbs another's state.
    const foreignUuid = randomUUID();
    await db.query(
      `INSERT INTO widget_instance (uuid, name, type, settings, status, theme)
       VALUES ($1, 'e2e-foreign-keep', 'text_block', $2::jsonb, TRUE, 'theme-a')`,
      [foreignUuid, JSON.stringify({ className: 'keep-me' })]
    );

    const { changesetId } = await insertThemedChangeset({
      adminUserId,
      theme: null
    });
    const { widgetUuid } = await seedWidgetPlacement(request, {
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

    // Foreign-theme widget untouched...
    const foreign = await db.query<{ settings: any; theme: string }>(
      `SELECT settings, theme FROM widget_instance WHERE uuid = $1`,
      [foreignUuid]
    );
    expect(foreign.rows[0].theme).toBe('theme-a');
    expect(foreign.rows[0].settings.className).toBe('keep-me');
    // ...and the just-published widget landed in the NULL bucket.
    expect(await readWidgetInstanceTheme(widgetUuid)).toBeNull();
  });
});

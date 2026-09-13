import { randomUUID } from 'node:crypto';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { loadAdminUserId } from '../../../shared/adminMeta.js';
import { insertThemedChangeset } from '../../../shared/changesetDb.js';
import {
  cleanupTestRolloutPlans,
  cleanupTestWidgets,
  discardAdminChangesets,
  getDb
} from '../../../shared/db.js';
import { insertRolloutPlanDirect } from '../../../shared/pbApi.js';

/**
 * "Replace homepage with this page" — API + DB level coverage of
 * specifications/replace-homepage-with-landing-page.md (§3–§7, §14).
 *
 * STATUS: written to the suite's conventions but NOT yet run against a live
 * server on this branch (the dev server available while it was authored ran a
 * different checkout). Expect small fixture adjustments on the first run.
 *
 * Isolation (spec §14): the developer's real homepage rows in the active theme
 * bucket are parked under a synthetic route for the duration and restored in
 * afterAll. Every seeded instance is `e2e-` named so clones (which copy the
 * name) are swept by cleanupTestWidgets. Backups are deleted through the API
 * with the uuids returned by execute.
 */

test.describe.configure({ mode: 'serial' });

const NAV_TIMEOUT = 90_000;
const PARKED_ROUTE = 'e2e-parked-homepage';

let adminUserId: number;
let activeTheme: string | null = null;
let landingPage: { uuid: string; urlKey: string };
const backupsToDelete: string[] = [];
const seeded = {
  hp1: { uuid: '', id: 0 },
  hp2: { uuid: '', id: 0 },
  hpChild: { uuid: '', id: 0 },
  hpShared: { uuid: '', id: 0 },
  a2: { uuid: '', id: 0 }
};

async function insertWidget(name: string, type = 'text_block') {
  const db = getDb();
  const { rows } = await db.query<{ widget_instance_id: number; uuid: string }>(
    `INSERT INTO widget_instance (name, type, settings, status, theme)
     VALUES ($1, $2, '{}'::jsonb, true, $3) RETURNING widget_instance_id, uuid::text AS uuid`,
    [name, type, activeTheme]
  );
  return { id: rows[0].widget_instance_id, uuid: rows[0].uuid };
}

async function insertPlacement(
  instanceId: number,
  route: string,
  area: string,
  sortOrder: number,
  entityUrn: string | null
) {
  const db = getDb();
  const { rows } = await db.query<{ uuid: string }>(
    `INSERT INTO widget_placement (widget_instance_id, route, area, sort_order, entity_urn, theme)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING uuid::text AS uuid`,
    [instanceId, route, area, sortOrder, entityUrn, activeTheme]
  );
  return rows[0].uuid;
}

async function homepageRows() {
  const db = getDb();
  const { rows } = await db.query<{ uuid: string; area: string; instance_uuid: string; name: string }>(
    `SELECT p.uuid::text AS uuid, p.area, wi.uuid::text AS instance_uuid, wi.name
       FROM widget_placement p JOIN widget_instance wi USING (widget_instance_id)
      WHERE p.route = 'homepage' AND p.entity_urn IS NULL AND p.theme IS NOT DISTINCT FROM $1
      ORDER BY p.sort_order`,
    [activeTheme]
  );
  return rows;
}

async function bodyRows(urn: string) {
  const db = getDb();
  const { rows } = await db.query<{ uuid: string; area: string; instance_uuid: string; name: string }>(
    `SELECT p.uuid::text AS uuid, p.area, wi.uuid::text AS instance_uuid, wi.name
       FROM widget_placement p JOIN widget_instance wi USING (widget_instance_id)
      WHERE p.entity_urn = $1 ORDER BY p.sort_order`,
    [urn]
  );
  return rows;
}

async function preflight(request: APIRequestContext, uuid: string) {
  const res = await request.get(`/api/landing-pages/${uuid}/replace-homepage`);
  return { status: res.status(), body: await res.json() };
}

async function execute(request: APIRequestContext, uuid: string, fp: { homepage: string; landingPage: string }) {
  const res = await request.post(`/api/landing-pages/${uuid}/replace-homepage`, {
    data: { confirm: true, homepageFingerprint: fp.homepage, landingPageFingerprint: fp.landingPage }
  });
  return { status: res.status(), body: await res.json() };
}

const urnOf = (uuid: string) => `urn:evershop:promotion:landing_page:${uuid}`;

test.describe('admin / landing page / replace homepage', () => {
  test.beforeAll(async () => {
    adminUserId = loadAdminUserId();
  });

  test.afterAll(async ({ request }) => {
    const db = getDb();
    for (const uuid of backupsToDelete) {
      await request.delete(`/api/landing-pages/${uuid}`);
    }
    if (landingPage?.uuid) await request.delete(`/api/landing-pages/${landingPage.uuid}`);
    await cleanupTestRolloutPlans();
    await discardAdminChangesets(adminUserId);
    await cleanupTestWidgets();
    // Restore the developer's homepage exactly as it was.
    await db.query(`UPDATE widget_placement SET route = 'homepage' WHERE route = $1`, [PARKED_ROUTE]);
  });

  test('setup: resolve the active theme, park the real homepage, seed fixtures', async ({ page, request }) => {
    test.setTimeout(240_000);
    // Opening the homepage editor mints (or reuses) the admin's draft tagged
    // with the server's active theme — the only reliable way to read it here.
    await page.goto('/admin/page-builder/edit/homepage', { timeout: NAV_TIMEOUT });
    // Wait for the preview iframe to render: it loads the storefront, which in
    // dev mode triggers the frontstore webpack compile. An API request sent
    // while that compile is in flight can get its connection reset, so make
    // sure it has finished before the first API call below.
    await expect(
      page.frameLocator('iframe[src*="changeset="]').locator('#app')
    ).toBeAttached({ timeout: NAV_TIMEOUT });
    const db = getDb();
    const { rows } = await db.query<{ theme: string | null }>(
      `SELECT theme FROM changeset WHERE created_by = $1 AND published_at IS NULL ORDER BY changeset_id DESC LIMIT 1`,
      [adminUserId]
    );
    activeTheme = rows[0]?.theme ?? null;
    await discardAdminChangesets(adminUserId);

    await db.query(
      `UPDATE widget_placement SET route = $1
        WHERE route = 'homepage' AND entity_urn IS NULL AND theme IS NOT DISTINCT FROM $2`,
      [PARKED_ROUTE, activeTheme]
    );

    // Homepage: text (P2), container + child (P4), shared with cart (P5).
    seeded.hp1 = await insertWidget('e2e-rh-hp1');
    await insertPlacement(seeded.hp1.id, 'homepage', 'content', 10, null);
    seeded.hp2 = await insertWidget('e2e-rh-hp2-columns', 'columns');
    await insertPlacement(seeded.hp2.id, 'homepage', 'content', 20, null);
    seeded.hpChild = await insertWidget('e2e-rh-hp2-child');
    await insertPlacement(seeded.hpChild.id, 'homepage', `columnsContainer_${seeded.hp2.uuid}_col_0`, 1, null);
    seeded.hpShared = await insertWidget('e2e-rh-shared');
    await insertPlacement(seeded.hpShared.id, 'homepage', 'content', 30, null);
    await insertPlacement(seeded.hpShared.id, 'cart', 'shoppingCartAfterSummary', 5, null);

    // Landing page A with a body: text (C1), container + child (C2/C3), hidden content row (C12).
    const key = `e2e-rh-${randomUUID().slice(0, 8)}`;
    const created = await request.post('/api/landing-pages', {
      data: { name: `e2e-rh ${key}`, url_key: key, status: 1 }
    });
    expect(created.status()).toBe(200);
    const uuid = (await created.json()).data.uuid as string;
    landingPage = { uuid, urlKey: key };
    const a1 = await insertWidget('e2e-rh-a1');
    await insertPlacement(a1.id, 'landingPageView', 'landing_page_content', 10, urnOf(uuid));
    seeded.a2 = await insertWidget('e2e-rh-a2-columns', 'columns');
    await insertPlacement(seeded.a2.id, 'landingPageView', 'landing_page_content', 20, urnOf(uuid));
    const a2child = await insertWidget('e2e-rh-a2-child');
    await insertPlacement(a2child.id, 'landingPageView', `columnsContainer_${seeded.a2.uuid}_col_1`, 1, urnOf(uuid));
    const hidden = await insertWidget('e2e-rh-hidden');
    await insertPlacement(hidden.id, 'landingPageView', 'content', 1, urnOf(uuid));
  });

  test('preflight reports the counts the dialog needs', async ({ request }) => {
    const { status, body } = await preflight(request, landingPage.uuid);
    expect(status).toBe(200);
    const d = body.data;
    expect(d.homepage.placementCount).toBe(4);
    expect(d.landingPage.bodyPlacementCount).toBe(3);
    expect(d.landingPage.hiddenPlacementCount).toBe(1);
    expect(d.backup.willCreate).toBe(true);
    expect(d.backup.name).toMatch(/^Homepage backup \d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
    expect(d.blockers.rolloutPlans).toEqual([]);
    expect(d.blockers.entityScopedHomepage).toBe(false);
    expect(d.fingerprints.homepage).toHaveLength(64);
    expect(d.warnings).toContain('LANDING_PAGE_HAS_HIDDEN_WIDGETS');
  });

  test('execute snapshots the homepage into a disabled backup and clones the body onto /', async ({ request }) => {
    const pre = await preflight(request, landingPage.uuid);
    const { status, body } = await execute(request, landingPage.uuid, pre.body.data.fingerprints);
    expect(status, JSON.stringify(body)).toBe(200);
    const r = body.data;
    backupsToDelete.push(r.backup.uuid);
    expect(r.backedUpPlacements).toBe(4);
    expect(r.clonedPlacements).toBe(3);
    // hp1, hp2, hpChild were homepage-only → deleted; hpShared survives on cart.
    expect(r.deletedInstances).toBe(3);

    const db = getDb();
    const hp = await homepageRows();
    expect(hp).toHaveLength(3);
    const names = hp.map((r) => r.name).sort();
    expect(names).toEqual(['e2e-rh-a1', 'e2e-rh-a2-child', 'e2e-rh-a2-columns']);
    const clonedParent = hp.find((r) => r.name === 'e2e-rh-a2-columns')!;
    expect(clonedParent.instance_uuid).not.toBe(seeded.a2.uuid);
    const clonedChild = hp.find((r) => r.name === 'e2e-rh-a2-child')!;
    expect(clonedChild.area).toBe(`columnsContainer_${clonedParent.instance_uuid}_col_1`);

    const backup = await db.query(`SELECT status, url_key FROM landing_page WHERE uuid = $1`, [r.backup.uuid]);
    expect(backup.rows[0].status).toBe(false);
    expect(backup.rows[0].url_key).toMatch(/^homepage-backup-\d{8}-\d{4}/);
    const backupBody = await bodyRows(urnOf(r.backup.uuid));
    expect(backupBody).toHaveLength(4);
    const bParent = backupBody.find((b) => b.name === 'e2e-rh-hp2-columns')!;
    expect(bParent.area).toBe('landing_page_content');
    expect(bParent.instance_uuid).not.toBe(seeded.hp2.uuid);
    const bChild = backupBody.find((b) => b.name === 'e2e-rh-hp2-child')!;
    expect(bChild.area).toBe(`columnsContainer_${bParent.instance_uuid}_col_0`);

    const shared = await db.query(
      `SELECT p.route FROM widget_placement p JOIN widget_instance wi USING (widget_instance_id) WHERE wi.uuid = $1`,
      [seeded.hpShared.uuid]
    );
    expect(shared.rows.map((x) => x.route)).toEqual(['cart']);
    const gone = await db.query(`SELECT 1 FROM widget_instance WHERE uuid = $1`, [seeded.hp1.uuid]);
    expect(gone.rowCount).toBe(0);
  });

  test('legacy widget editor can save a widget that lives only inside the backup', async ({ page }) => {
    // Before the fix this page seeded one blank, required, non-removable
    // placement row for such widgets, so Save was impossible without putting
    // the widget on "All pages".
    const backupBody = await bodyRows(urnOf(backupsToDelete[0]));
    const widget = backupBody.find((b) => b.name === 'e2e-rh-hp1')!;
    await page.goto(`/admin/widgets/edit/${widget.instance_uuid}`, { timeout: NAV_TIMEOUT });
    await expect(page.getByTestId('entity-scoped-placements-note')).toBeVisible({ timeout: NAV_TIMEOUT });
    await expect(page.getByText('Area is required')).toHaveCount(0);
    await page.getByRole('button', { name: /^save$/i }).click();
    await expect(page.getByText('Saved successfully!')).toBeVisible({ timeout: 30_000 });
    const db = getDb();
    const rows = await db.query(
      `SELECT p.route, p.entity_urn FROM widget_placement p JOIN widget_instance wi USING (widget_instance_id) WHERE wi.uuid = $1`,
      [widget.instance_uuid]
    );
    expect(rows.rows).toEqual([{ route: 'landingPageView', entity_urn: urnOf(backupsToDelete[0]) }]);
  });

  test('restore is the same action run from the backup', async ({ request }) => {
    const firstBackup = backupsToDelete[0];
    const pre = await preflight(request, firstBackup);
    expect(pre.status).toBe(200);
    const { status, body } = await execute(request, firstBackup, pre.body.data.fingerprints);
    expect(status, JSON.stringify(body)).toBe(200);
    backupsToDelete.push(body.data.backup.uuid);
    const hp = await homepageRows();
    expect(hp.map((r) => r.name).sort()).toEqual(
      ['e2e-rh-hp1', 'e2e-rh-hp2-child', 'e2e-rh-hp2-columns', 'e2e-rh-shared']
    );
  });

  test('an active rollout plan touching the homepage blocks the action', async ({ request }) => {
    const hp = await homepageRows();
    const cs = await insertThemedChangeset({ adminUserId, theme: activeTheme, name: `e2e-rh-cs-${randomUUID().slice(0, 8)}` });
    const db = getDb();
    await db.query(
      `INSERT INTO changeset_operation (changeset_id, route, entity_urn, old_payload, new_payload, change_order)
       VALUES ($1, 'homepage', $2, '{"sort_order":10}'::jsonb, '{"sort_order":11}'::jsonb, 1)`,
      [cs.changesetId, `urn:evershop:cms:widget_placement:${hp[0].uuid}`]
    );
    await insertRolloutPlanDirect({
      name: `e2e-rh-plan-${randomUUID().slice(0, 8)}`,
      changesetId: cs.changesetId,
      routeCursors: { homepage: 1 },
      startTime: new Date(Date.now() - 60_000),
      endTime: null,
      theme: activeTheme
    });
    const pre = await preflight(request, landingPage.uuid);
    expect(pre.body.data.blockers.rolloutPlans).toHaveLength(1);
    const { status, body } = await execute(request, landingPage.uuid, pre.body.data.fingerprints);
    expect(status).toBe(409);
    expect(body.error.code).toBe('HOMEPAGE_ROLLOUT_ACTIVE');
    expect(body.error.rolloutPlans).toHaveLength(1);
    await cleanupTestRolloutPlans();
    await db.query(`DELETE FROM changeset WHERE changeset_id = $1`, [cs.changesetId]);
  });

  test('unpublished draft ops on the homepage are discarded; the draft row survives; cart ops stay', async ({ request }) => {
    await discardAdminChangesets(adminUserId);
    const hp = await homepageRows();
    const cs = await insertThemedChangeset({ adminUserId, theme: activeTheme, name: `pb-draft-${adminUserId}` });
    const db = getDb();
    await db.query(
      `INSERT INTO changeset_operation (changeset_id, route, entity_urn, old_payload, new_payload, change_order)
       VALUES ($1, 'homepage', $2, '{"sort_order":10}'::jsonb, '{"sort_order":12}'::jsonb, 1),
              ($1, 'cart', 'urn:evershop:cms:widget_placement:00000000-0000-4000-8000-000000000000', '{"sort_order":1}'::jsonb, '{"sort_order":2}'::jsonb, 2)`,
      [cs.changesetId, `urn:evershop:cms:widget_placement:${hp[0].uuid}`]
    );
    await db.query(`UPDATE changeset SET route_cursors = '{"homepage":1,"cart":2}'::jsonb WHERE changeset_id = $1`, [cs.changesetId]);

    const pre = await preflight(request, landingPage.uuid);
    expect(pre.body.data.drafts.byCurrentAdmin).toBe(1);
    const { status, body } = await execute(request, landingPage.uuid, pre.body.data.fingerprints);
    expect(status, JSON.stringify(body)).toBe(200);
    backupsToDelete.push(body.data.backup.uuid);
    expect(body.data.discardedChangesets).toEqual([
      expect.objectContaining({ changesetId: cs.changesetId, kind: 'draft', operationsRemoved: 1 })
    ]);
    const ops = await db.query(`SELECT route FROM changeset_operation WHERE changeset_id = $1`, [cs.changesetId]);
    expect(ops.rows.map((o) => o.route)).toEqual(['cart']);
    const row = await db.query(`SELECT route_cursors FROM changeset WHERE changeset_id = $1`, [cs.changesetId]);
    expect(row.rowCount).toBe(1);
    expect(row.rows[0].route_cursors).toEqual({ cart: 2 });
  });

  test('an empty homepage still gets a backup (the restore point is unconditional)', async ({ request }) => {
    // At this point every homepage row in the bucket is an e2e clone (the real
    // rows are parked), so emptying the homepage is safe.
    const db = getDb();
    await db.query(
      `DELETE FROM widget_placement WHERE route = 'homepage' AND entity_urn IS NULL AND theme IS NOT DISTINCT FROM $1`,
      [activeTheme]
    );
    const pre = await preflight(request, landingPage.uuid);
    expect(pre.body.data.homepage.placementCount).toBe(0);
    expect(pre.body.data.backup.willCreate).toBe(true);
    const { status, body } = await execute(request, landingPage.uuid, pre.body.data.fingerprints);
    expect(status, JSON.stringify(body)).toBe(200);
    expect(body.data.backup).not.toBeNull();
    backupsToDelete.push(body.data.backup.uuid);
    expect(body.data.backedUpPlacements).toBe(0);
    const backup = await db.query(`SELECT status FROM landing_page WHERE uuid = $1`, [body.data.backup.uuid]);
    expect(backup.rows[0].status).toBe(false);
    expect(await bodyRows(urnOf(body.data.backup.uuid))).toHaveLength(0);
  });

  test('a stale fingerprint is refused with HOMEPAGE_CHANGED', async ({ request }) => {
    const pre = await preflight(request, landingPage.uuid);
    const { status, body } = await execute(request, landingPage.uuid, {
      homepage: 'f'.repeat(64),
      landingPage: pre.body.data.fingerprints.landingPage
    });
    expect(status).toBe(409);
    expect(body.error.code).toBe('HOMEPAGE_CHANGED');
  });
});

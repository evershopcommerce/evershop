import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { getDb } from '../../../shared/db.js';
import { runThemeCli } from '../../../shared/themeCli.js';
import {
  ManifestLike,
  purgeLandingPages,
  purgeThemeContent,
  readThemeJson,
  withTempThemeDir,
  writeManifest
} from '../../../shared/themeFixture.js';

/**
 * Landing pages shipped in `theme.json`
 * (specifications/theme-json-landing-pages.md), driven through the compiled
 * CLI against the live DB.
 *
 * The contract under test: a theme SEEDS pages for a fresh store. Pages are
 * not theme property — the `landing_page` row has no theme column, survives a
 * theme switch and an uninstall, and its `url_key` is generated per store from
 * the page name (never carried in the manifest).
 */
const cleanups: Array<() => Promise<void>> = [];
const pageUuids: string[] = [];

// Every step runs even if an earlier one throws: a cleanup that bails halfway
// leaves rows behind that collide with the next run's fixtures.
test.afterEach(async () => {
  const steps = [
    () => purgeLandingPages(getDb(), pageUuids.splice(0)),
    ...cleanups.splice(0)
  ];
  const failures: unknown[] = [];
  for (const step of steps) {
    try {
      await step();
    } catch (e) {
      failures.push(e);
    }
  }
  if (failures.length > 0) throw failures[0];
});

function widget(uuid: string, name: string, type = 'text_block') {
  return { uuid, type, name, settings: {} };
}
function body(uuid: string, w: string, sort = 10, area = 'landing_page_content') {
  return { uuid, widget_instance_uuid: w, area, sort_order: sort };
}
function landingPage(over: Record<string, unknown> = {}) {
  return { uuid: randomUUID(), name: 'Black Friday', status: true, placements: [], ...over };
}
function manifest(
  version: string,
  widgets: Array<Record<string, unknown>>,
  landingPages: Array<Record<string, unknown>> = []
): ManifestLike {
  return { theme_name: 'E2E', version, widgets, placements: [], landingPages };
}
async function provision(themeId: string, m: ManifestLike) {
  const { cleanup } = await withTempThemeDir(themeId, m);
  cleanups.push(async () => {
    await purgeThemeContent(getDb(), themeId);
    await cleanup();
  });
}
async function activate(id: string) {
  const res = await runThemeCli(['theme:active', id, '--content-only', '--yes']);
  return res;
}
async function readPage(uuid: string) {
  const { rows } = await getDb().query<{
    name: string;
    url_key: string;
    status: boolean;
    meta_title: string | null;
  }>(`SELECT name, url_key, status, meta_title FROM landing_page WHERE uuid::text = $1`, [uuid]);
  return rows[0] ?? null;
}
async function readBody(uuid: string) {
  const { rows } = await getDb().query<{
    area: string;
    route: string;
    theme: string | null;
    sort_order: number;
  }>(
    `SELECT p.area, p.route, p.theme, p.sort_order
       FROM widget_placement p
      WHERE p.entity_urn = $1 ORDER BY p.sort_order`,
    [`urn:evershop:promotion:landing_page:${uuid}`]
  );
  return rows;
}

test.describe('theme.json / landing pages', () => {
  test('install creates the page, its url_rewrite and its theme-bucketed body', async () => {
    const id = `e2e-lp-${randomUUID().slice(0, 8)}`;
    const w = randomUUID();
    // A name unique to this run: the url_key is DERIVED from it, and the dev DB
    // may already own the obvious slugs.
    const tag = randomUUID().slice(0, 8);
    const page = landingPage({
      name: `E2E Black Friday ${tag}`,
      meta_title: 'BF | E2E',
      placements: [body(randomUUID(), w)]
    });
    pageUuids.push(page.uuid as string);
    await provision(id, manifest('1.0.0', [widget(w, 'e2e-bf-hero')], [page]));

    const res = await activate(id);
    expect(res.exitCode, res.stdout + res.stderr).toBe(0);
    expect(res.stdout).toMatch(/1 landing pages/);

    const row = await readPage(page.uuid as string);
    expect(row).not.toBeNull();
    expect(row!.name).toBe(`E2E Black Friday ${tag}`);
    expect(row!.status).toBe(true);
    // url_key is DERIVED from the name — the manifest never carried one.
    expect(row!.url_key).toBe(`e2e-black-friday-${tag}`);

    const rewrite = await getDb().query(
      `SELECT request_path, target_path FROM url_rewrite WHERE entity_uuid = $1 AND entity_type = 'landing_page'`,
      [page.uuid]
    );
    expect(rewrite.rows[0]).toEqual({
      request_path: `/e2e-black-friday-${tag}`,
      target_path: `/landing/e2e-black-friday-${tag}`
    });

    const placements = await readBody(page.uuid as string);
    expect(placements).toHaveLength(1);
    expect(placements[0]).toMatchObject({
      route: 'landingPageView',
      area: 'landing_page_content',
      theme: id
    });
  });

  test('a taken name is suffixed, and a name shadowed by a static route never wins', async () => {
    const db = getDb();
    const id = `e2e-lpk-${randomUUID().slice(0, 8)}`;
    const w = randomUUID();
    const tag = randomUUID().slice(0, 8);
    const name = `E2E Taken ${tag}`;
    const slug = `e2e-taken-${tag}`;
    // An existing page already owns the slug this name would produce.
    const squatter = randomUUID();
    pageUuids.push(squatter);
    await db.query(
      `INSERT INTO landing_page (uuid, status, name, url_key) VALUES ($1, false, 'e2e squatter', $2)`,
      [squatter, slug]
    );

    const taken = landingPage({ name, placements: [body(randomUUID(), w)] });
    const reserved = landingPage({
      uuid: randomUUID(),
      name: 'Cart',
      placements: [body(randomUUID(), w)]
    });
    pageUuids.push(taken.uuid as string, reserved.uuid as string);
    await provision(id, manifest('1.0.0', [widget(w, 'e2e-key-w')], [taken, reserved]));

    const res = await activate(id);
    expect(res.exitCode, res.stdout + res.stderr).toBe(0);

    const collided = await readPage(taken.uuid as string);
    expect(collided!.url_key).toMatch(new RegExp(`^${slug}-\\d{5}$`));

    // `/cart` is a real storefront route: taking it would make the page
    // unreachable, so the generator suffixes instead.
    const cart = await readPage(reserved.uuid as string);
    expect(cart!.url_key).not.toBe('cart');
    expect(cart!.url_key).toMatch(/^cart-\d{5}$/);
  });

  test('a page that already exists is adopted: fields and url_key untouched', async () => {
    const db = getDb();
    const id = `e2e-lpa-${randomUUID().slice(0, 8)}`;
    const w = randomUUID();
    const uuid = randomUUID();
    const merchantKey = `e2e-merchant-${randomUUID().slice(0, 8)}`;
    pageUuids.push(uuid);
    await db.query(
      `INSERT INTO landing_page (uuid, status, name, url_key, meta_title)
       VALUES ($1, false, 'Merchant name', $2, 'merchant title')`,
      [uuid, merchantKey]
    );

    const page = landingPage({
      uuid,
      name: 'Theme name',
      meta_title: 'theme title',
      status: true,
      placements: [body(randomUUID(), w)]
    });
    await provision(id, manifest('1.0.0', [widget(w, 'e2e-adopt-w')], [page]));

    const res = await activate(id);
    expect(res.exitCode, res.stdout + res.stderr).toBe(0);
    expect(res.stdout).toMatch(/Adopted/);

    const row = await readPage(uuid);
    expect(row).toMatchObject({
      name: 'Merchant name',
      url_key: merchantKey,
      meta_title: 'merchant title',
      status: false
    });
    // The body is still installed onto the adopted page.
    expect(await readBody(uuid)).toHaveLength(1);
  });

  test('upgrade: author edit applies, merchant edit wins and is reported', async () => {
    const id = `e2e-lpu-${randomUUID().slice(0, 8)}`;
    const w = randomUUID();
    const page = landingPage({ meta_title: 'v1', placements: [body(randomUUID(), w)] });
    pageUuids.push(page.uuid as string);
    await provision(id, manifest('1.0.0', [widget(w, 'e2e-up-w')], [page]));
    expect((await activate(id)).exitCode).toBe(0);

    // Merchant renames the page in the admin.
    await getDb().query(`UPDATE landing_page SET name = 'Merchant rename' WHERE uuid::text = $1`, [
      page.uuid
    ]);

    // Author changes BOTH the name (conflict) and the meta title (clean).
    await writeManifest(
      id,
      manifest(
        '1.1.0',
        [widget(w, 'e2e-up-w')],
        [{ ...page, name: 'Author rename', meta_title: 'v2' }]
      )
    );
    const res = await activate(id);
    expect(res.exitCode, res.stdout + res.stderr).toBe(0);
    expect(res.stdout).toMatch(/Conflicts: 1/);

    const row = await readPage(page.uuid as string);
    expect(row!.name).toBe('Merchant rename'); // merchant wins
    expect(row!.meta_title).toBe('v2'); // author's clean edit applies
  });

  test('a page the merchant deleted is never re-created', async () => {
    const id = `e2e-lpd-${randomUUID().slice(0, 8)}`;
    const w = randomUUID();
    const page = landingPage({ placements: [body(randomUUID(), w)] });
    pageUuids.push(page.uuid as string);
    await provision(id, manifest('1.0.0', [widget(w, 'e2e-del-w')], [page]));
    expect((await activate(id)).exitCode).toBe(0);

    await purgeLandingPages(getDb(), [page.uuid as string]);
    expect(await readPage(page.uuid as string)).toBeNull();

    await writeManifest(id, manifest('1.1.0', [widget(w, 'e2e-del-w')], [page]));
    expect((await activate(id)).exitCode).toBe(0);
    expect(await readPage(page.uuid as string)).toBeNull();
  });

  test('a page dropped from a later version keeps its row and loses its body', async () => {
    const id = `e2e-lpr-${randomUUID().slice(0, 8)}`;
    const w = randomUUID();
    const page = landingPage({ placements: [body(randomUUID(), w)] });
    pageUuids.push(page.uuid as string);
    await provision(id, manifest('1.0.0', [widget(w, 'e2e-rel-w')], [page]));
    expect((await activate(id)).exitCode).toBe(0);
    expect(await readBody(page.uuid as string)).toHaveLength(1);

    await writeManifest(id, manifest('1.1.0', [widget(w, 'e2e-rel-w')], []));
    const res = await activate(id);
    expect(res.exitCode, res.stdout + res.stderr).toBe(0);
    expect(res.stdout).toMatch(/LEFT IN PLACE/);

    // Row survives; body is gone.
    expect(await readPage(page.uuid as string)).not.toBeNull();
    expect(await readBody(page.uuid as string)).toHaveLength(0);
  });

  test('export round-trips the page without a url_key, and skips homepage backups', async () => {
    const db = getDb();
    const id = `e2e-lpx-${randomUUID().slice(0, 8)}`;
    const w = randomUUID();
    const page = landingPage({ name: 'Exported Page', placements: [body(randomUUID(), w)] });
    pageUuids.push(page.uuid as string);
    await provision(id, manifest('1.0.0', [widget(w, 'e2e-x-w')], [page]));
    expect((await activate(id)).exitCode).toBe(0);

    // A homepage backup in the same theme bucket must never be exported.
    const backup = randomUUID();
    pageUuids.push(backup);
    await db.query(
      `INSERT INTO landing_page (uuid, status, name, url_key)
       VALUES ($1, false, 'Homepage backup 2026-09-13 10:00', $2)`,
      [backup, `homepage-backup-${randomUUID().slice(0, 8)}`]
    );
    const backupWidget = randomUUID();
    await db.query(
      `INSERT INTO widget_instance (uuid, name, type, settings, status, theme)
       VALUES ($1, 'e2e-backup-w', 'text_block', '{}'::jsonb, TRUE, $2)`,
      [backupWidget, id]
    );
    await db.query(
      `INSERT INTO widget_placement (widget_instance_id, route, area, sort_order, entity_urn, theme)
       SELECT widget_instance_id, 'landingPageView', 'landing_page_content', 10, $1, $2
         FROM widget_instance WHERE uuid = $3`,
      [`urn:evershop:promotion:landing_page:${backup}`, id, backupWidget]
    );

    const res = await runThemeCli(['theme:export-content', id, '1.1.0', '--force']);
    expect(res.exitCode, res.stdout + res.stderr).toBe(0);

    const exported = await readThemeJson(id);
    expect(exported.landingPages).toHaveLength(1);
    const [ex] = exported.landingPages!;
    expect(ex).toMatchObject({ uuid: page.uuid, name: 'Exported Page', status: true });
    expect(ex).not.toHaveProperty('url_key');
    expect((ex.placements as unknown[])).toHaveLength(1);
    // The backup's widget is not exported either — it lives only in that page.
    expect(
      (exported.widgets as Array<{ name: string }>).some((x) => x.name === 'e2e-backup-w')
    ).toBe(false);
  });

  test('--no-pages omits the section entirely', async () => {
    const id = `e2e-lpn-${randomUUID().slice(0, 8)}`;
    const w = randomUUID();
    const page = landingPage({ placements: [body(randomUUID(), w)] });
    pageUuids.push(page.uuid as string);
    await provision(id, manifest('1.0.0', [widget(w, 'e2e-np-w')], [page]));
    expect((await activate(id)).exitCode).toBe(0);

    const res = await runThemeCli(['theme:export-content', id, '1.1.0', '--force', '--no-pages']);
    expect(res.exitCode, res.stdout + res.stderr).toBe(0);
    expect((await readThemeJson(id)).landingPages).toBeUndefined();
  });

  test('uninstall empties the body but leaves the page reachable', async () => {
    const id = `e2e-lpun-${randomUUID().slice(0, 8)}`;
    const w = randomUUID();
    const page = landingPage({ placements: [body(randomUUID(), w)] });
    pageUuids.push(page.uuid as string);
    await provision(id, manifest('1.0.0', [widget(w, 'e2e-un-w')], [page]));
    expect((await activate(id)).exitCode).toBe(0);

    const res = await runThemeCli(['theme:uninstall', id, '--yes']);
    expect(res.exitCode, res.stdout + res.stderr).toBe(0);
    expect(res.stdout).toMatch(/LEFT IN PLACE/);

    expect(await readPage(page.uuid as string)).not.toBeNull();
    expect(await readBody(page.uuid as string)).toHaveLength(0);
  });

  test('a section container parent is accepted (its children are not orphaned)', async () => {
    const id = `e2e-lpsec-${randomUUID().slice(0, 8)}`;
    const section = randomUUID();
    const child = randomUUID();
    const page = landingPage({
      placements: [
        body(randomUUID(), section, 10),
        body(randomUUID(), child, 1, `columnsContainer_${section}_col_0`)
      ]
    });
    pageUuids.push(page.uuid as string);
    await provision(
      id,
      manifest(
        '1.0.0',
        [widget(section, 'e2e-sec', 'section'), widget(child, 'e2e-sec-child')],
        [page]
      )
    );

    const res = await activate(id);
    expect(res.exitCode, res.stdout + res.stderr).toBe(0);
    const placements = await readBody(page.uuid as string);
    expect(placements.map((p) => p.area).sort()).toEqual(
      [`columnsContainer_${section}_col_0`, 'landing_page_content'].sort()
    );
  });
});

import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Pool, PoolClient } from 'pg';
import { getCoreModules } from '../../bin/lib/loadModules.js';
import { getEnabledLanguages } from '../../modules/setting/services/setting.js';
import { scanForRoutes } from '../router/scanForRoutes.js';
import { slugifyWithFallback } from '../util/slugify.js';
import type { LandingPageRecord } from './manifest.js';

/**
 * Landing pages shipped by a theme (`theme.json` → `landingPages[]`).
 *
 * Landing pages are NOT theme property: the `landing_page` row has no theme
 * column, so a page installed by a theme stays reachable after a theme switch
 * — only its body (theme-bucketed `widget_placement` rows) follows the active
 * theme. "A theme's pages" is therefore DERIVED: pages with at least one
 * placement in that theme's bucket. See
 * specifications/theme-json-landing-pages.md.
 */

/** url_keys of homepage backups made by "Replace homepage" — never a theme's content. */
export const HOMEPAGE_BACKUP_URL_KEY_PREFIX = 'homepage-backup-';

/** Landing-page fields a manifest can carry (never `url_key`, never the schedule). */
export const LANDING_PAGE_MANIFEST_FIELDS = [
  'name',
  'description',
  'meta_title',
  'meta_description',
  'status'
] as const;

export type LandingPageField = (typeof LANDING_PAGE_MANIFEST_FIELDS)[number];

export function landingPageUrn(uuid: string): string {
  return `urn:evershop:promotion:landing_page:${uuid}`;
}

/**
 * Single-segment static storefront paths (`/cart`, `/search`, …). A url_key
 * equal to one of these would never reach the `url_rewrite` fallback, so the
 * page would 404 — the same rule `assertUrlKeyAvailable` enforces at runtime.
 *
 * The CLI never bootstraps modules, so this scans `route.json` files straight
 * off disk. Extensions are not scanned (they need a compiled `dist/` and the
 * loader's env branching); a collision with an extension route is caught later
 * by the same check running in `assertUrlKeyAvailable` when the merchant edits
 * the page. Failures degrade to an empty set rather than blocking an install.
 */
export function reservedStorefrontSlugs(): Set<string> {
  const slugs = new Set<string>();
  try {
    for (const mod of getCoreModules()) {
      const dir = path.join(mod.path, 'pages', 'frontStore');
      if (!existsSync(dir)) continue;
      for (const route of scanForRoutes(dir, false, false)) {
        const m = /^\/([a-zA-Z0-9-]+)$/.exec(route.path);
        if (m) slugs.add(m[1].toLowerCase());
      }
    }
  } catch {
    // Unreadable module tree — don't block the install over a soft check.
  }
  return slugs;
}

export interface UrlKeyGuard {
  reserved: Set<string>;
  locales: Set<string>;
}

export async function loadUrlKeyGuard(): Promise<UrlKeyGuard> {
  let locales: string[] = [];
  try {
    locales = await getEnabledLanguages();
  } catch {
    // Settings table missing (unmigrated DB) — locale check degrades to none.
  }
  return {
    reserved: reservedStorefrontSlugs(),
    locales: new Set(locales.map((l) => l.toLowerCase()))
  };
}

/**
 * Is `key` unusable as a landing-page url_key? True when it is shadowed by a
 * static route or a locale prefix, or already owned by any `url_rewrite` row
 * or landing page. Mirrors `assertUrlKeyAvailable`, minus the same-entity
 * exemption (generation only ever runs for a brand-new page).
 */
export async function isUrlKeyTaken(
  conn: Pool | PoolClient,
  key: string,
  guard: UrlKeyGuard
): Promise<boolean> {
  if (guard.reserved.has(key) || guard.locales.has(key)) return true;
  const { rows } = await conn.query(
    `SELECT 1
       FROM url_rewrite
      WHERE request_path = $1
      UNION ALL
     SELECT 1 FROM landing_page WHERE url_key = $2
      LIMIT 1`,
    [`/${key}`, key]
  );
  return rows.length > 0;
}

const MAX_SUFFIX_ATTEMPTS = 20;

/**
 * Derive a free url_key from a page's name (decision D3): the manifest never
 * carries one, so a theme cannot promise a URL and two stores may land the
 * same page at different paths. Inside the theme nothing depends on it —
 * widget links target the page by URN.
 *
 * `random5` is injectable so the generator stays deterministic under test.
 */
export async function generateUrlKey(
  conn: Pool | PoolClient,
  page: { uuid: string; name: string },
  guard: UrlKeyGuard,
  random5: () => string = () => String(Math.floor(10000 + Math.random() * 90000))
): Promise<string> {
  const base = slugifyWithFallback(page.name, page.uuid);
  if (!(await isUrlKeyTaken(conn, base, guard))) return base;
  for (let i = 0; i < MAX_SUFFIX_ATTEMPTS; i += 1) {
    const candidate = `${base}-${random5()}`;
     
    if (!(await isUrlKeyTaken(conn, candidate, guard))) return candidate;
  }
  // Pathological collision run — fall back to something uuid-derived, which
  // cannot collide with another page.
  return `${base}-${page.uuid.replace(/-/g, '').slice(0, 8)}`;
}

export interface LandingPageRow {
  landing_page_id: number;
  uuid: string;
  url_key: string;
}

export async function findLandingPagesByUuid(
  conn: Pool | PoolClient,
  uuids: string[]
): Promise<Map<string, LandingPageRow>> {
  if (uuids.length === 0) return new Map();
  const { rows } = await conn.query<LandingPageRow>(
    `SELECT landing_page_id, uuid::text AS uuid, url_key
       FROM landing_page WHERE uuid::text = ANY($1::text[])`,
    [uuids]
  );
  return new Map(rows.map((r) => [r.uuid, r]));
}

/** Keep a landing page's root-level friendly URL in sync (mirrors `syncLandingPageUrlRewrite`). */
export async function syncUrlRewrite(
  conn: PoolClient,
  uuid: string,
  urlKey: string
): Promise<void> {
  await conn.query(
    `INSERT INTO url_rewrite (entity_type, entity_uuid, request_path, target_path)
     VALUES ('landing_page', $1, $2, $3)
     ON CONFLICT (entity_uuid) DO UPDATE
        SET request_path = EXCLUDED.request_path,
            target_path  = EXCLUDED.target_path,
            entity_type  = EXCLUDED.entity_type`,
    [uuid, `/${urlKey}`, `/landing/${urlKey}`]
  );
}

/**
 * Create a landing page from a manifest record. The url_key is generated here
 * and is merchant data from this moment on — never merged on upgrade, never
 * exported.
 */
export async function insertLandingPage(
  conn: PoolClient,
  page: LandingPageRecord,
  guard: UrlKeyGuard
): Promise<{ urlKey: string }> {
  const urlKey = await generateUrlKey(conn, page, guard);
  await conn.query(
    `INSERT INTO landing_page
       (uuid, status, name, url_key, description, meta_title, meta_description)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      page.uuid,
      page.status === true,
      page.name,
      urlKey,
      page.description ?? null,
      page.meta_title ?? null,
      page.meta_description ?? null
    ]
  );
  await syncUrlRewrite(conn, page.uuid, urlKey);
  return { urlKey };
}

export async function updateLandingPageFields(
  conn: PoolClient,
  uuid: string,
  changed: Record<string, unknown>
): Promise<void> {
  const keys = Object.keys(changed);
  if (keys.length === 0) return;
  const sets = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
  await conn.query(
    `UPDATE landing_page SET ${sets}, updated_at = NOW() WHERE uuid::text = $1`,
    [uuid, ...keys.map((k) => changed[k])]
  );
}

export interface ExportablePage {
  uuid: string;
  name: string;
  url_key: string;
  description: string | null;
  meta_title: string | null;
  meta_description: string | null;
  status: boolean;
}

/**
 * Pages this theme has content on (D2): at least one placement in the theme's
 * bucket whose widget is enabled. Homepage backups are excluded — their bodies
 * are theme-stamped copies of a homepage, not theme content.
 */
export async function derivePagesForTheme(
  conn: Pool | PoolClient,
  themeId: string
): Promise<ExportablePage[]> {
  const { rows } = await conn.query<ExportablePage>(
    `SELECT DISTINCT lp.uuid::text AS uuid, lp.name, lp.url_key, lp.description,
            lp.meta_title, lp.meta_description, lp.status
       FROM landing_page lp
       JOIN widget_placement p
         ON p.entity_urn = 'urn:evershop:promotion:landing_page:' || lp.uuid::text
       JOIN widget_instance wi ON wi.widget_instance_id = p.widget_instance_id
      WHERE p.theme IS NOT DISTINCT FROM $1
        AND wi.status = TRUE
        AND lp.url_key NOT LIKE $2
      ORDER BY lp.name`,
    [themeId, `${HOMEPAGE_BACKUP_URL_KEY_PREFIX}%`]
  );
  return rows;
}

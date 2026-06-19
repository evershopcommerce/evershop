import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getActiveChangesetId } from '../../../shared/changesetDb.js';
import { discardAdminChangesets, getDb } from '../../../shared/db.js';
import { seedWidgetPlacement } from '../../../shared/pbApi.js';

/**
 * URN-based link resolution at the storefront. Widgets store internal
 * links as URNs (`urn:evershop:<service>:<type>:<uuid>`); GraphQL
 * resolvers call `resolveLink` per request, which looks up the current
 * `url_rewrite.request_path` for product/category or `cms_page.url_key`
 * for pages. The merchandiser benefits two ways:
 *
 *   1. Live rename: when a category slug changes, every widget linking
 *      to it picks up the new URL on the next request. No widget edits
 *      needed.
 *   2. Deleted entity: returns null, the widget's resolver falls back to
 *      a safe default (e.g. CouponBlock uses `/`) — no broken render.
 *
 * We exercise the changeset-preview path (`?changeset=<token>`), which
 * runs the same `loadActiveOps` query as production. Avoids publishing
 * so the live storefront stays untouched.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_META_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '.auth',
  'admin.meta.json'
);
function loadAdminUserId(): number {
  return (
    JSON.parse(readFileSync(ADMIN_META_PATH, 'utf8')) as {
      adminUserId: number;
    }
  ).adminUserId;
}

async function readChangesetToken(changesetId: number): Promise<string> {
  const db = getDb();
  const { rows } = await db.query<{ token: string }>(
    `SELECT token FROM changeset WHERE changeset_id = $1`,
    [changesetId]
  );
  return rows[0].token;
}

async function pickExistingCategory(): Promise<{
  uuid: string;
  requestPath: string;
}> {
  const db = getDb();
  const { rows } = await db.query<{
    entity_uuid: string;
    request_path: string;
  }>(
    `SELECT entity_uuid, request_path
     FROM url_rewrite
     WHERE entity_type = 'category'
     LIMIT 1`
  );
  if (rows.length === 0) {
    throw new Error(
      'No url_rewrite rows for entity_type=category — seed at least one category in the dev DB before running this spec.'
    );
  }
  return {
    uuid: rows[0].entity_uuid,
    requestPath: rows[0].request_path
  };
}

/**
 * Ensure a draft changeset exists for the admin so we can seed ops into
 * it. The simpler `seedWidgetPlacement` path needs an existing changeset
 * id; this helper makes one when none is present (e.g. when the test
 * doesn't open the editor UI first).
 *
 * Returns the changeset id + token.
 */
async function getOrCreateDraft(): Promise<{ id: number; token: string }> {
  const adminUserId = loadAdminUserId();
  let id = await getActiveChangesetId(adminUserId);
  if (id == null) {
    const db = getDb();
    const { rows } = await db.query<{ changeset_id: number; token: string }>(
      `INSERT INTO changeset (name, route_cursors, token, created_by)
       VALUES ($1, $2::jsonb, $3, $4)
       RETURNING changeset_id, token`,
      [`pb-draft-${adminUserId}`, JSON.stringify({}), randomUUID(), adminUserId]
    );
    id = rows[0].changeset_id;
    return { id, token: rows[0].token };
  }
  const token = await readChangesetToken(id);
  return { id, token };
}

test.describe('URN link resolution', () => {
  test.beforeEach(async () => {
    await discardAdminChangesets(loadAdminUserId());
  });

  test('coupon_block CTA URN resolves to current url_rewrite', async ({
    request
  }) => {
    const category = await pickExistingCategory();
    const { id: changesetId, token } = await getOrCreateDraft();

    await seedWidgetPlacement(request, {
      changesetId,
      route: 'homepage',
      placementRoute: 'homepage',
      area: 'content',
      widgetType: 'coupon_block',
      widgetSettings: {
        eyebrow: null,
        heading: 'URN cta',
        body: null,
        code: 'URN10',
        ctaLabel: 'Browse',
        ctaLink: `urn:evershop:catalog:category:${category.uuid}`,
        ctaNewTab: false,
        expires: null,
        borderStyle: 'solid',
        backgroundColor: null
      }
    });

    const res = await request.get(`/?changeset=${token}`);
    expect(res.ok()).toBe(true);
    const html = await res.text();

    // The coupon block's CTA renders as <a href="...">. Validate the
    // resolved href appears anchored to the BEM root class — keeps the
    // assertion from matching unrelated links that happen to point at
    // the same path.
    const ctaRegex = new RegExp(
      `evershop-coupon-block[\\s\\S]*?href="${escapeRegex(
        category.requestPath
      )}"`,
      'i'
    );
    expect(html).toMatch(ctaRegex);
  });

  test('coupon_block falls back to "/" when URN target is missing', async ({
    request
  }) => {
    const { id: changesetId, token } = await getOrCreateDraft();

    // Random UUID that won't exist as a cms_page — the page loader returns
    // null when the lookup misses, so `resolveLink` returns null and
    // CouponBlock's `(await resolveLink(...)) || '/'` fallback kicks in.
    //
    // (Catalog product/category loaders fall back to `buildUrl('categoryView',
    // { uuid })` — not null — so they never trigger the widget-level safe-
    // default branch. cms:page is the cleanest signal that null bubbles up
    // through the resolveLink contract.)
    const ghostUuid = randomUUID();

    await seedWidgetPlacement(request, {
      changesetId,
      route: 'homepage',
      placementRoute: 'homepage',
      area: 'content',
      widgetType: 'coupon_block',
      widgetSettings: {
        eyebrow: null,
        heading: 'broken urn',
        body: null,
        code: 'URN20',
        ctaLabel: 'Browse',
        ctaLink: `urn:evershop:cms:page:${ghostUuid}`,
        ctaNewTab: false,
        expires: null,
        borderStyle: 'solid',
        backgroundColor: null
      }
    });

    const res = await request.get(`/?changeset=${token}`);
    expect(res.ok()).toBe(true);
    const html = await res.text();

    // The widget still renders — broken URN must not 500 the page.
    expect(html).toContain('evershop-coupon-block');
    // Find every `<a>` whose class includes evershop-coupon-block__cta and
    // assert all of them point to the fallback "/". Multiple coupon blocks
    // may exist in the dev DB (the BEM class isn't unique), but with the
    // changeset preview only OUR seeded one is overlaid with the broken
    // URN — pre-existing coupon CTAs use their own (intact) URNs.
    //
    // To narrow it to our widget specifically, find the CTA pair with our
    // unique code "URN20" nearby.
    const cleaned = html.replace(/\s+/g, ' ');
    const idx = cleaned.indexOf('URN20');
    expect(idx).toBeGreaterThan(-1);
    // The CTA `<a>` comes after the code box in the JSX — search forward
    // from the code position to the next coupon-block__cta link.
    const sub = cleaned.slice(idx);
    const ctaMatch = sub.match(
      /<a\s+href="([^"]+)"[^>]*class="evershop-coupon-block__cta/
    );
    expect(ctaMatch?.[1]).toBe('/');
  });
});

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

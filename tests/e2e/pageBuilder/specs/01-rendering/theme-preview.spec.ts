import { expect, test } from '@playwright/test';
import { loadAdminUserId } from '../../../shared/adminMeta.js';
import { insertThemedChangeset } from '../../../shared/changesetDb.js';
import { discardAdminChangesets } from '../../../shared/db.js';

/**
 * Phase 2 — storefront preview theme enforcement (spec 04 § 9.4). The
 * `enforcePreviewThemeMatch` front-store middleware refuses a
 * `?changeset=<token>` preview whose changeset belongs to a theme other than
 * the active one: 409 for JSON/XHR clients, 302 → `/` for browsers.
 */
test.describe('rendering / preview theme enforcement', () => {
  const adminUserId = loadAdminUserId();

  test.beforeEach(async () => {
    await discardAdminChangesets(adminUserId);
  });

  test('stale-theme preview → 409 for JSON clients, 302 → / for browsers', async ({
    request
  }) => {
    // Changeset tagged for a theme other than the active (NULL) one.
    const { token } = await insertThemedChangeset({
      adminUserId,
      theme: 'preview-theme-x'
    });

    const jsonRes = await request.get(`/?changeset=${token}`, {
      headers: { Accept: 'application/json' },
      maxRedirects: 0
    });
    expect(jsonRes.status()).toBe(409);

    const htmlRes = await request.get(`/?changeset=${token}`, {
      headers: { Accept: 'text/html' },
      maxRedirects: 0
    });
    expect(htmlRes.status()).toBe(302);
    expect(htmlRes.headers()['location']).toBe('/');
  });

  test('matching-theme preview is allowed through (200)', async ({
    request
  }) => {
    // NULL-theme changeset matches the active (NULL) theme — no enforcement.
    const { token } = await insertThemedChangeset({ adminUserId, theme: null });
    const res = await request.get(`/?changeset=${token}`, {
      headers: { Accept: 'text/html' },
      maxRedirects: 0
    });
    expect(res.status()).toBe(200);
  });
});

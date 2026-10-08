import { test, expect } from '@playwright/test';
import { getDb } from '../../shared/db.js';
import {
  ADDRESS_TAG,
  cleanupAddressWorld,
  isAddressSchemaMigrated,
  loadLegacyFixture,
  seedLegacyOrderAddresses
} from '../../shared/addressDb.js';

/**
 * The legacy-order invariant, live (spec § 5.3): rows stored before the
 * rename, read back through the migrated schema and rendered with the real
 * `formatAddressRow`, must print the recorded lines — retired Vietnamese
 * codes included. The DB-less half is
 * packages/evershop/src/lib/address/tests/unit/legacyOrderFixture.test.ts.
 *
 * Uses the compiled library from packages/evershop/dist (run `npm run compile`
 * at the repo root first) and a THROWAWAY database (see addressDb.ts).
 */

test.describe('legacy order addresses render identically on the migrated schema', () => {
  let formatAddressRow: (row: Record<string, unknown>, locale?: string) => Promise<string[]>;

  test.beforeAll(async () => {
    test.skip(
      !(await isAddressSchemaMigrated()),
      'database has not run checkout Version-1.0.12 yet'
    );
    const lib = await import(
      new URL('../../../../packages/evershop/dist/lib/address/index.js', import.meta.url).href
    );
    formatAddressRow = lib.formatAddressRow;
    await cleanupAddressWorld();
    await seedLegacyOrderAddresses();
  });

  test.afterAll(async () => {
    await cleanupAddressWorld();
  });

  test('every recorded row renders its recorded lines, read back from order_address', async () => {
    const db = getDb();
    for (const entry of loadLegacyFixture()) {
      const { rows } = await db.query<Record<string, unknown>>(
        `SELECT * FROM "order_address" WHERE "recipient" = $1`,
        [`${ADDRESS_TAG} ${entry.row.full_name}`]
      );
      expect(rows, entry.label).toHaveLength(1);
      // Strip the cleanup tag before rendering; everything else is as stored.
      const stored = { ...rows[0], recipient: String(rows[0].recipient).replace(`${ADDRESS_TAG} `, '') };
      for (const [locale, lines] of Object.entries(entry.expected)) {
        expect(await formatAddressRow(stored, locale), `${entry.label} [${locale}]`).toEqual(lines);
      }
    }
  });

  test('values survived the migration byte for byte: no column holds a renamed-away value', async () => {
    const db = getDb();
    for (const entry of loadLegacyFixture()) {
      const { rows } = await db.query<Record<string, unknown>>(
        `SELECT "address_line_1", "address_line_2", "locality", "administrative_area", "postal_code", "country", "telephone"
           FROM "order_address" WHERE "recipient" = $1`,
        [`${ADDRESS_TAG} ${entry.row.full_name}`]
      );
      expect(rows[0]).toEqual({
        address_line_1: entry.row.address_1,
        address_line_2: entry.row.address_2 ?? null,
        locality: entry.row.city,
        administrative_area: entry.row.province ?? null,
        postal_code: entry.row.postcode,
        country: entry.row.country,
        telephone: entry.row.telephone ?? null
      });
    }
  });
});

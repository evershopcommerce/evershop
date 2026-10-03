import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { formatAddressRow } from '../../display.js';
import { __resetAddressFormatsForTests } from '../../formats.js';
import {
  __resetRegionProvidersForTests,
  registerRegionProvider,
  resolveRegionName
} from '../../regions.js';
import { resetAddressRuntime } from '../../runtime.js';
import type { AddressRow } from '../../types.js';

/**
 * The legacy-order invariant (spec § 5.3), pinned without a database.
 *
 * `fixtures/legacyOrderAddressRows.json` holds pre-migration `order_address`
 * rows in the OLD column names, exactly as stored, with the display lines
 * they must keep producing. The migration only renames columns, so the
 * mapping below IS the migration as seen by a row; rendering the mapped row
 * through `formatAddressRow` must yield the recorded lines, retired region
 * keys included. The live half of this check (real rows, real migration) is
 * tests/e2e/address/specs/legacy-order-fixture.spec.ts.
 */

interface LegacyFixture {
  rows: Array<{
    label: string;
    row: Record<string, string | number | null>;
    expected: Record<string, string[]>;
  }>;
}

// Tests run from dist; the fixture is read from the source tree (repo root cwd,
// the same convention as components/tests/unit/clientImportGraph.test.ts).
const FIXTURE = path.resolve(
  process.cwd(),
  'packages/evershop/src/lib/address/tests/unit/fixtures/legacyOrderAddressRows.json'
);

/** The column rename of checkout Version-1.0.12 / customer Version-1.0.5, as a mapping. */
const LEGACY_TO_NEW: Record<string, string> = {
  full_name: 'recipient',
  address_1: 'address_line_1',
  address_2: 'address_line_2',
  city: 'locality',
  province: 'administrative_area',
  postcode: 'postal_code',
  country: 'country',
  telephone: 'telephone'
};

export function legacyRowToAddressRow(
  legacy: Record<string, string | number | null>
): AddressRow {
  const row: AddressRow = {};
  for (const [oldName, newName] of Object.entries(LEGACY_TO_NEW)) {
    if (oldName in legacy) {
      row[newName] = legacy[oldName] as string | null;
    }
  }
  return row;
}

describe('legacy order addresses render identically after the rename migration', () => {
  const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')) as LegacyFixture;

  beforeEach(() => {
    __resetAddressFormatsForTests();
    __resetRegionProvidersForTests();
    resetAddressRuntime();
  });

  it('has the five recorded rows', () => {
    expect(fixture.rows).toHaveLength(5);
  });

  for (const entry of fixture.rows) {
    for (const [locale, lines] of Object.entries(entry.expected)) {
      it(`${entry.label} — renders the recorded lines in '${locale}'`, async () => {
        const rendered = await formatAddressRow(legacyRowToAddressRow(entry.row), locale);
        expect(rendered).toEqual(lines);
      });
    }
  }

  it('never prints INVALID_PROVINCE, an empty line, or a raw region code where a name exists', async () => {
    for (const entry of fixture.rows) {
      const rendered = await formatAddressRow(legacyRowToAddressRow(entry.row), 'en');
      for (const line of rendered) {
        expect(line).not.toContain('INVALID');
        expect(line.trim()).not.toBe('');
        expect(line).not.toMatch(/\b(US|DE|VN|HK)-[A-Z0-9]{2}\b/);
      }
    }
  });

  it('a retired key resolves to its name (append-only rule) and an unknown key falls back to itself', async () => {
    expect(await resolveRegionName('VN', 'administrative_area', 'VN-57', 'vi')).toBe('Bình Dương');
    expect(await resolveRegionName('VN', 'administrative_area', 'VN-57', 'en')).toBe('Binh Duong');
    expect(await resolveRegionName('VN', 'administrative_area', 'VN-99', 'en')).toBe('VN-99');
  });

  it('still renders the same lines after a package retires a surviving key', async () => {
    // A future data refresh retires VN-SG into a hypothetical successor. The
    // old order must keep printing "Ho Chi Minh", not a code.
    registerRegionProvider('VN', {
      levels: ['administrative_area'],
      list: () => [
        { key: 'VN-NEW', name: 'Thành phố mới', latinName: 'New City' },
        {
          key: 'VN-SG',
          name: 'Hồ Chí Minh',
          latinName: 'Ho Chi Minh',
          retired: true,
          mergedInto: 'VN-NEW'
        }
      ]
    });
    const row = fixture.rows.find((r) => r.row.province === 'VN-SG')!;
    const rendered = await formatAddressRow(legacyRowToAddressRow(row.row), 'en');
    expect(rendered).toEqual(row.expected.en);
  });
});

import { describe, expect, it } from '@jest/globals';
import { deriveAddressSchema } from '../../derive.js';
import { ADDRESS_LABELS, labelFor } from '../../labels.js';
import type { ResolvedAddressField } from '../../types.js';
import { CN, DE, HK, JP, US, VN, ZZ } from './addressFixtures.js';

const STATE_NAME_TYPES = ['province', 'state', 'prefecture', 'area', 'county', 'emirate', 'department', 'district', 'do_si', 'island', 'oblast', 'parish', 'region'];
const LOCALITY_NAME_TYPES = ['city', 'district', 'post_town', 'suburb'];
const SUBLOCALITY_NAME_TYPES = ['suburb', 'district', 'neighborhood', 'village', 'village_township', 'townland', 'ward'];
const ZIP_NAME_TYPES = ['postal', 'zip', 'pin', 'eircode'];
const FIXED = ['recipient', 'given_name', 'family_name', 'organization', 'address_line', 'address_line_2', 'address_line_3', 'telephone', 'country', 'sorting_code'];

describe('lib/address labels', () => {
  it('has an English source string for every labelType the derivation can emit', () => {
    for (const key of [...FIXED, ...STATE_NAME_TYPES, ...LOCALITY_NAME_TYPES, ...SUBLOCALITY_NAME_TYPES, ...ZIP_NAME_TYPES]) {
      expect(typeof ADDRESS_LABELS[key]).toBe('string');
      expect(ADDRESS_LABELS[key].length).toBeGreaterThan(0);
    }
  });

  it('uses the agreed source strings', () => {
    expect(ADDRESS_LABELS.recipient).toBe('Full name');
    expect(ADDRESS_LABELS.given_name).toBe('Given name');
    expect(ADDRESS_LABELS.family_name).toBe('Family name');
    expect(ADDRESS_LABELS.organization).toBe('Company');
    expect(ADDRESS_LABELS.address_line).toBe('Address');
    expect(ADDRESS_LABELS.address_line_2).toBe('Address 2');
    expect(ADDRESS_LABELS.address_line_3).toBe('Address line 3');
    expect(ADDRESS_LABELS.postal).toBe('Postcode');
    expect(ADDRESS_LABELS.zip).toBe('ZIP code');
    expect(ADDRESS_LABELS.pin).toBe('PIN code');
    expect(ADDRESS_LABELS.do_si).toBe('Do/Si');
    expect(ADDRESS_LABELS.village_township).toBe('Village/Township');
    expect(ADDRESS_LABELS.sorting_code).toBe('Sorting code');
  });

  it('labelFor prefers the field label, then the typed label, then the id', () => {
    const extra: ResolvedAddressField = { id: 'tax_id', type: 'text', labelType: 'extra', label: 'Tax ID', required: false, row: 6 };
    const typed: ResolvedAddressField = { id: 'postal_code', token: 'Z', type: 'text', labelType: 'zip', required: true, row: 5 };
    const unknown: ResolvedAddressField = { id: 'mystery', type: 'text', labelType: 'nonsense', required: false, row: 7 };
    expect(labelFor(extra)).toBe('Tax ID');
    expect(labelFor(typed)).toBe('ZIP code');
    expect(labelFor(unknown)).toBe('mystery');
  });

  it('labels every field of the fixture schemas', () => {
    for (const record of [US, DE, HK, JP, VN, CN, ZZ]) {
      for (const locale of ['en', 'ja', 'zh', 'vi']) {
        const schema = deriveAddressSchema({ country: 'XX', record, locale, regionLevels: ['administrative_area'] });
        for (const field of schema.fields) {
          expect(ADDRESS_LABELS[field.labelType]).toBeDefined();
          expect(labelFor(field)).not.toBe(field.id);
        }
      }
    }
  });
});

import { describe, it, expect } from '@jest/globals';
import { ADDRESS_LABELS } from '@evershop/evershop/lib/address/labels';
import { LABEL_TYPES, addressFieldLabel, addressMessage, labelTypeLabel } from '../../labelTypes.js';

/**
 * `labelTypes.ts` is a literal `_()` switch so the translation extractor sees
 * every English label; `lib/address/labels.ts` is the server's map. They must
 * stay identical: a label type added on one side only would show its raw id
 * on the other.
 */
describe('labelTypes.ts mirrors lib/address/labels.ts', () => {
  it('knows exactly the same label types', () => {
    expect([...LABEL_TYPES].sort()).toEqual(Object.keys(ADDRESS_LABELS).sort());
  });

  it('returns the same English source string for every label type (no dictionary loaded)', () => {
    for (const [type, source] of Object.entries(ADDRESS_LABELS)) {
      expect(labelTypeLabel(type)).toBe(source);
    }
    expect(labelTypeLabel('bogus')).toBeUndefined();
  });

  it('labels an extra by its own English label and an unknown type by its id', () => {
    expect(addressFieldLabel({ id: 'tax_id', type: 'text', labelType: 'extra', label: 'Tax ID', required: false, row: 1 })).toBe('Tax ID');
    expect(addressFieldLabel({ id: 'mystery', type: 'text', labelType: 'nope', required: false, row: 1 })).toBe('mystery');
    expect(addressFieldLabel({ id: 'postal_code', type: 'text', labelType: 'zip', required: true, row: 1 })).toBe('ZIP code');
  });

  it('interpolates the schema and server message keys', () => {
    expect(addressMessage('${field} is required', { field: 'City' })).toBe('City is required');
    expect(addressMessage('${field} is not valid', { field: 'ZIP code' })).toBe('ZIP code is not valid');
    expect(addressMessage('${field} is not a valid region', { field: 'State' })).toBe('State is not a valid region');
    expect(addressMessage('Custom ${field} rule', { field: 'X' })).toBe('Custom X rule');
  });
});

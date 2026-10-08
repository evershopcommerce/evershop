import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  __resetAddressExtrasForTests,
  getAddressExtras,
  registerAddressField
} from '../../extras.js';
import {
  __resetAddressFormatsForTests,
  getRegistryGeneration,
  lockAddressRegistry
} from '../../formats.js';
import type { ExtraFieldDefinition } from '../../types.js';

const taxId: ExtraFieldDefinition = {
  id: 'tax_id',
  type: 'text',
  label: 'Tax ID',
  pattern: { regex: '^[0-9]{10,13}$', messageKey: 'Invalid tax ID' },
  countries: ['VN'],
  surfaces: ['billing'],
  after: 'organization'
};

describe('lib/address extra fields', () => {
  beforeEach(() => {
    __resetAddressExtrasForTests();
    __resetAddressFormatsForTests();
  });

  it('rejects an id that collides with an address column', () => {
    for (const id of ['locality', 'telephone', 'country', 'recipient', 'given_name', 'extra_free']) {
      const def = { ...taxId, id };
      if (id === 'extra_free') {
        expect(() => registerAddressField(def)).not.toThrow();
      } else {
        expect(() => registerAddressField(def)).toThrow(/collides with an address column/);
      }
    }
  });

  it('rejects a duplicate id and an empty id', () => {
    registerAddressField(taxId);
    expect(() => registerAddressField({ ...taxId, label: 'Other' })).toThrow(/already registered/);
    expect(() => registerAddressField({ ...taxId, id: '' })).toThrow(/non-empty string id/);
  });

  it('stores a copy and returns copies', () => {
    const def: ExtraFieldDefinition = { ...taxId, countries: ['vn'] };
    registerAddressField(def);
    def.label = 'MUTATED';
    def.countries!.push('US');
    def.pattern!.regex = 'MUTATED';

    const [stored] = getAddressExtras();
    expect(stored.label).toBe('Tax ID');
    expect(stored.countries).toEqual(['VN']); // upper-cased at registration
    expect(stored.pattern).toEqual({ regex: '^[0-9]{10,13}$', messageKey: 'Invalid tax ID' });
    expect(stored.required).toBe(false); // default filled in

    stored.label = 'MUTATED AGAIN';
    expect(getAddressExtras()[0].label).toBe('Tax ID');
  });

  it('scopes by country', () => {
    registerAddressField(taxId);
    registerAddressField({ id: 'note', type: 'textarea', label: 'Delivery note' });
    expect(getAddressExtras('VN').map((d) => d.id)).toEqual(['tax_id', 'note']);
    expect(getAddressExtras('vn').map((d) => d.id)).toEqual(['tax_id', 'note']);
    expect(getAddressExtras('US').map((d) => d.id)).toEqual(['note']);
    // '' is "no country": only country-agnostic extras apply
    expect(getAddressExtras('').map((d) => d.id)).toEqual(['note']);
    // no argument: no filter
    expect(getAddressExtras().map((d) => d.id)).toEqual(['tax_id', 'note']);
  });

  it('scopes by surface', () => {
    registerAddressField(taxId);
    registerAddressField({ id: 'note', type: 'textarea', label: 'Delivery note', surfaces: ['shipping', 'account'] });
    registerAddressField({ id: 'everywhere', type: 'text', label: 'Everywhere' });
    expect(getAddressExtras('VN', 'billing').map((d) => d.id)).toEqual(['tax_id', 'everywhere']);
    expect(getAddressExtras('VN', 'shipping').map((d) => d.id)).toEqual(['note', 'everywhere']);
    expect(getAddressExtras('VN', 'account').map((d) => d.id)).toEqual(['note', 'everywhere']);
    expect(getAddressExtras('VN').map((d) => d.id)).toEqual(['tax_id', 'note', 'everywhere']);
    expect(getAddressExtras(undefined, 'billing').map((d) => d.id)).toEqual(['tax_id', 'everywhere']);
  });

  it('keeps registration order', () => {
    registerAddressField({ id: 'c', type: 'text', label: 'C' });
    registerAddressField({ id: 'a', type: 'text', label: 'A' });
    registerAddressField({ id: 'b', type: 'text', label: 'B' });
    expect(getAddressExtras().map((d) => d.id)).toEqual(['c', 'a', 'b']);
  });

  it('bumps the registry generation', () => {
    const start = getRegistryGeneration();
    registerAddressField(taxId);
    expect(getRegistryGeneration()).toBe(start + 1);
  });

  it('throws after the lock with the carrier-registry message shape', () => {
    lockAddressRegistry();
    expect(() => registerAddressField(taxId)).toThrow(
      "Cannot register address field 'tax_id' after bootstrap. Call registerAddressField from your extension's bootstrap.ts."
    );
    expect(getAddressExtras()).toEqual([]);
  });

  it('__resetAddressExtrasForTests clears the registry', () => {
    registerAddressField(taxId);
    __resetAddressExtrasForTests();
    expect(getAddressExtras()).toEqual([]);
    expect(() => registerAddressField(taxId)).not.toThrow();
  });
});

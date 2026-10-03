import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  __resetAddressFormatsForTests,
  bumpRegistryGeneration,
  getAddressFormat,
  getRegistryGeneration,
  isAddressRegistryLocked,
  lockAddressRegistry,
  patchAddressFormat
} from '../../formats.js';
import { DEFAULT_ADDRESS_FORMAT } from '../../formats/index.js';
import { VN_WARD_PATCH } from './addressFixtures.js';

describe('lib/address formats registry', () => {
  beforeEach(() => {
    __resetAddressFormatsForTests();
  });

  describe('getAddressFormat', () => {
    it('merges the bundled record over DEFAULT field by field', () => {
      const de = getAddressFormat('DE');
      // DE's own values
      expect(de.fmt).toBe('%N%n%O%n%A%n%Z %C');
      expect(de.require).toBe('ACZ');
      expect(de.zip).toBe('\\d{5}');
      // inherited from ZZ because DE's record is silent on them
      expect(de.state_name_type).toBe('province');
      expect(de.locality_name_type).toBe('city');
      expect(de.sublocality_name_type).toBe('suburb');
      expect(de.zip_name_type).toBe('postal');
      expect(de.upper).toBe('C');
    });

    it('resolves an unknown or empty code to DEFAULT', () => {
      expect(getAddressFormat('QZ')).toEqual(DEFAULT_ADDRESS_FORMAT);
      expect(getAddressFormat('')).toEqual(DEFAULT_ADDRESS_FORMAT);
      expect(DEFAULT_ADDRESS_FORMAT.fmt).toBe('%N%n%O%n%A%n%C');
      expect(DEFAULT_ADDRESS_FORMAT.require).toBe('AC');
    });

    it('upper-cases and trims the code', () => {
      expect(getAddressFormat(' us ')).toEqual(getAddressFormat('US'));
      expect(getAddressFormat('us').fmt).toBe('%N%n%O%n%A%n%C, %S %Z');
    });

    it('never returns the shared object: mutations do not leak', () => {
      const first = getAddressFormat('US');
      first.fmt = 'MUTATED';
      first.languages!.push('xx');
      first.telephone!.pattern = 'MUTATED';
      const second = getAddressFormat('US');
      expect(second.fmt).toBe('%N%n%O%n%A%n%C, %S %Z');
      expect(second.languages).toEqual(['en']);
      expect(second.telephone?.pattern).toBeUndefined();
      expect(second).not.toBe(first);

      const unknown = getAddressFormat('QZ');
      unknown.fmt = 'MUTATED';
      expect(DEFAULT_ADDRESS_FORMAT.fmt).toBe('%N%n%O%n%A%n%C');
      expect(getAddressFormat('QZ')).not.toBe(unknown);
    });
  });

  describe('patchAddressFormat', () => {
    it('applies the reference VN patch on top of the bundled record', () => {
      patchAddressFormat('VN', VN_WARD_PATCH);
      const vn = getAddressFormat('VN');
      expect(vn.fmt).toBe('%N%n%O%n%A%n%D%n%C%n%S');
      expect(vn.require).toBe('ACDS');
      expect(vn.sublocality_name_type).toBe('ward');
      // telephone merges key by key: the bundled dialCode survives
      expect(vn.telephone).toEqual({
        dialCode: '+84',
        pattern: '^(\\+84|0)[0-9]{9}$',
        example: '0912 345 678'
      });
      // untouched fields stay
      expect(vn.zip).toBe('\\d{5}\\d?');
      expect(vn.languages).toEqual(['vi']);
    });

    it('composes several patches for one code in order', () => {
      patchAddressFormat('QZ', { fmt: '%N%n%A%n%C', require: 'AC', telephone: { dialCode: '+999' } });
      patchAddressFormat('QZ', { require: 'ANC', telephone: { pattern: '^[0-9]{6}$' } });
      patchAddressFormat('QZ', { telephone: { example: '123456' } });
      const qz = getAddressFormat('QZ');
      expect(qz.fmt).toBe('%N%n%A%n%C');
      expect(qz.require).toBe('ANC');
      expect(qz.telephone).toEqual({ dialCode: '+999', pattern: '^[0-9]{6}$', example: '123456' });
      // unknown code still inherits the DEFAULT's other fields
      expect(qz.state_name_type).toBe('province');
      expect(qz.zip_name_type).toBe('postal');
    });

    it('replaces scalars, fmt/lfmt and languages whole', () => {
      patchAddressFormat('QZ', { languages: ['vi'], lfmt: '%N%n%A', zip: '\\d{4}' });
      patchAddressFormat('QZ', { languages: ['vi', 'en'], lfmt: '%A%n%N', zip: '\\d{5}' });
      const qz = getAddressFormat('QZ');
      expect(qz.languages).toEqual(['vi', 'en']);
      expect(qz.lfmt).toBe('%A%n%N');
      expect(qz.zip).toBe('\\d{5}');
    });

    it('ignores undefined values in a patch', () => {
      patchAddressFormat('DE', { zip: undefined, require: undefined });
      expect(getAddressFormat('DE').zip).toBe('\\d{5}');
      expect(getAddressFormat('DE').require).toBe('ACZ');
    });

    it('copies the patch, so later mutation of the argument has no effect', () => {
      const patch = { telephone: { pattern: '^a$' }, languages: ['vi'] };
      patchAddressFormat('QZ', patch);
      patch.telephone.pattern = '^b$';
      patch.languages.push('en');
      expect(getAddressFormat('QZ').telephone?.pattern).toBe('^a$');
      expect(getAddressFormat('QZ').languages).toEqual(['vi']);
    });

    it('normalizes the code', () => {
      patchAddressFormat(' vn ', { require: 'ACS' });
      expect(getAddressFormat('VN').require).toBe('ACS');
    });

    it('rejects an empty code or a missing patch', () => {
      expect(() => patchAddressFormat('', { require: 'A' })).toThrow(/country code/);
      expect(() =>
        patchAddressFormat('VN', undefined as unknown as Record<string, never>)
      ).toThrow(/patch object/);
    });

    it('bumps the registry generation on every patch', () => {
      const start = getRegistryGeneration();
      patchAddressFormat('VN', { require: 'ACS' });
      expect(getRegistryGeneration()).toBe(start + 1);
      patchAddressFormat('VN', { require: 'ACSZ' });
      expect(getRegistryGeneration()).toBe(start + 2);
      bumpRegistryGeneration();
      expect(getRegistryGeneration()).toBe(start + 3);
    });
  });

  describe('lock', () => {
    it('throws with the carrier-registry message shape after lockAddressRegistry()', () => {
      expect(isAddressRegistryLocked()).toBe(false);
      lockAddressRegistry();
      expect(isAddressRegistryLocked()).toBe(true);
      expect(() => patchAddressFormat('VN', { require: 'ACS' })).toThrow(
        "Cannot patch address format 'VN' after bootstrap. Call patchAddressFormat from your extension's bootstrap.ts."
      );
      // reads keep working
      expect(getAddressFormat('VN').fmt).toBe('%N%n%O%n%A%n%C%n%S %Z');
    });

    it('reports the normalized code in the message', () => {
      lockAddressRegistry();
      expect(() => patchAddressFormat('vn', {})).toThrow("address format 'VN'");
    });

    it('__resetAddressFormatsForTests clears patches, unlocks and resets the generation', () => {
      patchAddressFormat('VN', { require: 'ACS' });
      lockAddressRegistry();
      __resetAddressFormatsForTests();
      expect(isAddressRegistryLocked()).toBe(false);
      expect(getRegistryGeneration()).toBe(0);
      expect(getAddressFormat('VN').require).toBe('AS');
    });
  });
});

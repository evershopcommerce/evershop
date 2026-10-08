import { afterEach, describe, expect, it } from '@jest/globals';
import {
  configureAddressRuntime,
  resetAddressRuntime
} from '../../../../lib/address/runtime.js';
import { ADDRESS_SETTINGS_DEFAULTS } from '../../../../lib/address/settings.js';
import {
  normalizeAddressInput,
  normalizeTelephone
} from '../../services/customer/address/normalizeAddressInput.js';

const run = (input: Record<string, unknown>, context?: Record<string, unknown>) =>
  normalizeAddressInput.call(context, input);

const splitMode = () =>
  configureAddressRuntime({
    getSettings: () => ({ ...ADDRESS_SETTINGS_DEFAULTS, nameFormat: 'split' })
  });

describe('normalizeAddressInput — the normalization seam (spec § 3.8, § 3.12)', () => {
  afterEach(() => resetAddressRuntime());

  it('trims every string and upper-cases the country', () => {
    const out = run({ recipient: '  Jane Smith ', locality: ' Mountain View', country: 'us' });
    expect(out).toMatchObject({ recipient: 'Jane Smith', locality: 'Mountain View', country: 'US' });
  });

  describe('telephone → E.164 with the record dial code', () => {
    it.each([
      ['US', '(650) 253-0000', '+16502530000'],
      ['VN', '0912 345 678', '+84912345678'],
      ['DE', '+49 30 1234567', '+49301234567'],
      ['FR', '0033 1 23 45 67 89', '+33123456789'],
      ['IT', '06 1234567', '+39061234567'],
      ['GB', '', '']
    ])('%s: %s → %s', (country, input, expected) => {
      expect(normalizeTelephone(input, country)).toBe(expected);
    });

    it('leaves a value the validator must judge untouched (letters), and a country without a dial code trimmed', () => {
      expect(normalizeTelephone('call me', 'US')).toBe('call me');
      expect(normalizeTelephone(' 12345 ', 'ZZ')).toBe('12345');
      expect(normalizeTelephone(null, 'US')).toBeNull();
    });

    it('uses the stored row country on update when the payload omits country', () => {
      const out = run({ telephone: '0912 345 678' }, { previous: { country: 'VN' } });
      expect(out.telephone).toBe('+84912345678');
    });
  });

  describe('recipient and name parts', () => {
    it('composes recipient from parts in the record order (given_first)', () => {
      const out = run({ given_name: 'Jane', family_name: 'Smith', country: 'US' });
      expect(out.recipient).toBe('Jane Smith');
    });

    it('composes recipient from parts in the record order (family_first for VN)', () => {
      const out = run({ given_name: 'Văn A', family_name: 'Nguyễn', country: 'VN' });
      expect(out.recipient).toBe('Nguyễn Văn A');
    });

    it('keeps both when recipient and parts are sent in single mode', () => {
      const out = run({ recipient: 'J. Smith', given_name: 'Jane', family_name: 'Smith', country: 'US' });
      expect(out).toMatchObject({ recipient: 'J. Smith', given_name: 'Jane', family_name: 'Smith' });
    });

    it('split mode: recipient is derived from the parts, previous parts fill the gaps', () => {
      splitMode();
      const out = run(
        { family_name: 'Doe', country: 'US' },
        { previous: { given_name: 'Jane', family_name: 'Smith', recipient: 'Jane Smith', country: 'US' } }
      );
      expect(out.recipient).toBe('Jane Doe');
    });

    it('single mode: editing recipient directly clears the stored parts (§ 3.12 rule 6)', () => {
      const out = run(
        { recipient: 'Janet Smith' },
        { previous: { given_name: 'Jane', family_name: 'Smith', recipient: 'Jane Smith', country: 'US' } }
      );
      expect(out).toMatchObject({ recipient: 'Janet Smith', given_name: null, family_name: null });
    });

    it('single mode: an unchanged recipient leaves the parts alone', () => {
      const out = run(
        { recipient: 'Jane Smith', telephone: '650 253 0000' },
        { previous: { given_name: 'Jane', family_name: 'Smith', recipient: 'Jane Smith', country: 'US' } }
      );
      expect(out.given_name).toBeUndefined();
      expect(out.family_name).toBeUndefined();
    });
  });

  it('returns a non-object input as is', () => {
    expect(run(null as unknown as Record<string, unknown>)).toBeNull();
  });
});

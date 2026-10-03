import { describe, expect, it } from '@jest/globals';
import {
  computeFingerprintFromCart,
  computeFingerprintFromCtx
} from '../../../services/shipping/computeFingerprint.js';

const DEST = {
  recipient: 'Jane Smith',
  telephone: '+16502530000',
  address_line_1: '1600 Amphitheatre Pkwy',
  country: 'US',
  administrative_area: 'US-CA',
  locality: 'Mountain View',
  dependent_locality: null,
  postal_code: '94043',
  extra: { nickname: 'Home' }
};

const cartLike = (address: Record<string, unknown>) => ({
  getData: (key: string) =>
    ({ shipping_address: address, total_weight: 2, sub_total: 100 })[key],
  getItems: () => [{ getData: (key: string) => ({ product_id: 1, qty: 2 })[key] }]
});
const ctxLike = (destination: Record<string, unknown>) =>
  ({
    destination,
    items: [{ productId: 1, qty: 2 }],
    totalWeight: 2,
    totalValue: 100
  }) as never;

describe('shipping quote fingerprint (spec § 3.10)', () => {
  it('FromCart and FromCtx agree for the same logical state', () => {
    expect(computeFingerprintFromCart(cartLike(DEST))).toBe(computeFingerprintFromCtx(ctxLike(DEST)));
  });

  it('changes when a geographic level changes — the dependent locality included', () => {
    const base = computeFingerprintFromCart(cartLike(DEST));
    expect(computeFingerprintFromCart(cartLike({ ...DEST, dependent_locality: 'Ward 1' }))).not.toBe(base);
    expect(computeFingerprintFromCart(cartLike({ ...DEST, administrative_area: 'US-NV' }))).not.toBe(base);
    expect(computeFingerprintFromCart(cartLike({ ...DEST, postal_code: '94044' }))).not.toBe(base);
  });

  it('ignores the recipient, telephone, street lines and extras', () => {
    const base = computeFingerprintFromCart(cartLike(DEST));
    expect(
      computeFingerprintFromCart(
        cartLike({
          ...DEST,
          recipient: 'Someone Else',
          telephone: '+10000000000',
          address_line_1: 'Other street',
          extra: { nickname: 'Work' }
        })
      )
    ).toBe(base);
  });
});

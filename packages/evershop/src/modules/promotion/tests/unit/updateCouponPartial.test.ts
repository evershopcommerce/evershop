import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
  createRecordingBuilder,
  definedEntries
} from '../../../base/tests/unit/helpers/recordingQueryBuilder.js';

/**
 * Core issue #1103: a coupon update that carries only the fields to change
 * must leave every other column alone. A schema `default` of null for
 * start_date and end_date was written back as if the caller had sent it, which
 * removed the coupon's dates.
 */
const db = createRecordingBuilder();

jest.unstable_mockModule('@evershop/postgres-query-builder', () => db.module);
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  getConnection: async () => ({})
}));

const { default: updateCoupon } = await import(
  '../../services/coupon/updateCoupon.js'
);

const storedCoupon = {
  coupon_id: 1,
  uuid: 'k-1',
  coupon: 'SPRING',
  status: 1,
  description: 'Spring',
  discount_amount: '10',
  discount_type: 'percentage_discount_to_entire_order',
  start_date: '2026-03-01',
  end_date: '2026-06-01'
};

describe('updateCoupon with a partial payload (#1103)', () => {
  beforeEach(() => db.setRows({ coupon: { ...storedCoupon } }));

  it('writes only the field that was sent', async () => {
    await updateCoupon('k-1', { description: 'Spring sale' }, {});

    const [couponWrite] = db.writesTo('coupon');
    expect(couponWrite.given).toEqual({ description: 'Spring sale' });
    expect(Object.keys(definedEntries(couponWrite.given))).toEqual([
      'description'
    ]);
    expect(db.transaction).toEqual(['start', 'commit']);
  });

  it('still writes a value that is sent, null included (removes the end date)', async () => {
    await updateCoupon('k-1', { end_date: null } as any, {});

    const [couponWrite] = db.writesTo('coupon');
    expect(couponWrite.given).toEqual({ end_date: null });
  });

  it('still rejects an invalid value, and writes nothing', async () => {
    await expect(
      updateCoupon('k-1', { discount_amount: 'abc' } as any, {})
    ).rejects.toThrow();
    expect(db.writes).toEqual([]);
    expect(db.transaction).toEqual(['start', 'rollback']);
  });
});

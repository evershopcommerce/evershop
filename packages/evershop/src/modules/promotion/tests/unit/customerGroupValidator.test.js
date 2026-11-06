import { jest, describe, it, expect } from '@jest/globals';

jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: {}
}));
jest.unstable_mockModule('../../../tax/services/taxSettings.js', () => ({
  getPriceIncludingTax: () => false
}));
const { registerDefaultValidators } = await import(
  '../../services/registerDefaultValidators.js'
);
const validators = registerDefaultValidators().filter(
  (fn) => fn.name === 'customerGroupValidator'
);

describe('coupon customer group restriction', () => {
  it('registers one customer group validator', () => {
    expect(validators).toHaveLength(1);
  });

  it.each([
    ['matching numeric ID', [2], 7, 2, true],
    ['matching form string ID', ['2'], 7, 2, true],
    ['another group', ['1'], 7, 2, false],
    ['guest', ['1'], undefined, undefined, false],
    ['customer without a group', ['1'], 7, undefined, false],
    ['no restriction', undefined, 7, 2, true],
    ['empty restriction for guest', [], undefined, undefined, true]
  ])('%s', async (_case, groups, customerId, groupId, expected) => {
    const cart = {
      getData: (key) =>
        ({ customer_id: customerId, customer_group_id: groupId }[key])
    };
    const results = await Promise.all(
      validators.map((validate) =>
        validate(cart, { condition: {}, user_condition: { groups } })
      )
    );
    expect(results.every(Boolean)).toBe(expected);
  });
});

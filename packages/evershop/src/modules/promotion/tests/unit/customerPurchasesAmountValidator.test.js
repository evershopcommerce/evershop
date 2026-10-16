import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const query = jest.fn();
const connection = { query, release: jest.fn() };
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: connection
}));
jest.unstable_mockModule('../../../tax/services/taxSettings.js', () => ({
  getPriceIncludingTax: () => false
}));

const { registerDefaultValidators } = await import(
  '../../services/registerDefaultValidators.js'
);
const validator = registerDefaultValidators().find(
  (fn) => fn.name === 'customerPurchasesAmountValidator'
);
const cart = { getData: (key) => (key === 'customer_id' ? 7 : undefined) };

beforeEach(() => query.mockReset());

describe('coupon minimum customer purchase amount', () => {
  it.each([
    ['below', '99.99', false],
    ['equal', '100.00', true],
    ['above', '100.01', true],
    ['no paid orders', null, false]
  ])('%s the numeric threshold', async (_case, total, expected) => {
    query.mockResolvedValue({ rows: [{ total }] });
    await expect(
      validator(cart, { user_condition: { purchased: 100 } })
    ).resolves.toBe(expected);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql] = query.mock.calls[0];
    expect(sql.text).toContain('SUM(grand_total)');
    expect(Object.values(sql.values)).toEqual([7, 'paid']);
  });

  it.each([undefined, 0])(
    'does not query without a threshold (%s)',
    async (purchased) => {
      await expect(
        validator(cart, { user_condition: { purchased } })
      ).resolves.toBe(true);
      expect(query).not.toHaveBeenCalled();
    }
  );

  it('rejects a guest when a threshold is set', async () => {
    await expect(
      validator(
        { getData: () => undefined },
        { user_condition: { purchased: 100 } }
      )
    ).resolves.toBe(false);
    expect(query).not.toHaveBeenCalled();
  });
});

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * `insertOrder` numbers a new order: the id first, then the `orderNumber`
 * processors inside a savepoint, then one insert, and the default number
 * (10000 plus the id) whenever the processors' number cannot be used.
 *
 * The registry and the connection are stand-ins here; what Postgres does with
 * the savepoint and the triggers is proved on a real database in
 * orderNumberDb.test.ts.
 */

const getValue = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const warning = jest.fn<(message: string) => void>();

jest.unstable_mockModule('../../../../lib/util/registry.js', () => ({
  getValue
}));
jest.unstable_mockModule('../../../../lib/log/logger.js', () => ({
  debug: () => undefined,
  info: () => undefined,
  success: () => undefined,
  error: () => undefined,
  warning
}));

const { insertOrder, defaultOrderNumber, MAX_ORDER_NUMBER_LENGTH } =
  await import('../../services/orderNumber.js');

const ORDER_ID = 42;
const DEFAULT = '10042';
const NOW = new Date('2026-11-20T08:00:00.000Z');
const COLUMNS = [
  'order_id',
  'uuid',
  'order_number',
  'currency',
  'cart_id',
  'meta_data',
  'created_at'
];

interface Call {
  sql: string;
  params?: unknown[];
}

/**
 * A connection in a transaction that records every statement. An insert
 * succeeds unless `refuse(number)` returns an error for its order number.
 */
function connection(
  refuse: (number: string) => Error | undefined = () => undefined
) {
  const calls: Call[] = [];
  return {
    INTRANSACTION: true,
    calls,
    /** The statements, without the values */
    statements: () =>
      calls.map(({ sql }) =>
        /^INSERT INTO "order"/.test(sql)
          ? 'INSERT'
          : /information_schema/.test(sql)
          ? 'COLUMNS'
          : /nextval/.test(sql)
          ? 'NEXTVAL'
          : sql
      ),
    /** What each insert would save, column by column */
    inserts: () =>
      calls
        .filter(({ sql }) => /^INSERT INTO "order"/.test(sql))
        .map(({ sql, params }) => {
          const names = sql
            .slice(sql.indexOf('(') + 1, sql.indexOf(')'))
            .split(',')
            .map((name) => name.trim().replace(/"/g, ''));
          return Object.fromEntries(
            names.map((name, i) => [name, (params ?? [])[i]])
          );
        }),
    async query(sql: string, params?: unknown[]) {
      const flat = sql.replace(/\s+/g, ' ').trim();
      calls.push({ sql: flat, params });
      if (/information_schema/.test(flat)) {
        return { rows: COLUMNS.map((column_name) => ({ column_name })) };
      }
      if (/nextval/.test(flat)) {
        return { rows: [{ id: ORDER_ID, now: NOW }] };
      }
      if (/^INSERT INTO "order"/.test(flat)) {
        const names = flat
          .slice(flat.indexOf('(') + 1, flat.indexOf(')'))
          .split(',')
          .map((name) => name.trim().replace(/"/g, ''));
        const row = Object.fromEntries(
          names.map((name, i) => [name, (params ?? [])[i]])
        );
        const error = refuse(row.order_number as string);
        if (error) throw error;
        return { rows: [row] };
      }
      return { rows: [] };
    }
  };
}

const uniqueViolation = () =>
  Object.assign(new Error('duplicate key value violates unique constraint'), {
    code: '23505',
    constraint: 'ORDER_NUMBER_UNIQUE'
  });

const OPTIONS = {
  source: 'checkout' as const,
  shippingAddress: null,
  billingAddress: null,
  cart: null
};

const ROW = { uuid: 'u-1', currency: 'USD', cart_id: 7 };

describe('insertOrder', () => {
  beforeEach(() => {
    getValue.mockReset();
    // No processor: the registry hands back the init value
    getValue.mockImplementation(async (_name, init) => init);
    warning.mockReset();
  });

  it('numbers the order 10000 plus its id when no processor changes it', async () => {
    const db = connection();
    const order = await insertOrder(db as never, ROW, OPTIONS);

    expect(order).toMatchObject({ order_id: ORDER_ID, insertId: ORDER_ID });
    expect(order.order_number).toBe(DEFAULT);
    expect(defaultOrderNumber(1)).toBe('10001');
    // The id is taken before the one insert, and the processors run in a savepoint
    expect(db.statements()).toEqual([
      'COLUMNS',
      'NEXTVAL',
      'SAVEPOINT evershop_order_number',
      'INSERT',
      'RELEASE SAVEPOINT evershop_order_number'
    ]);
    expect(db.calls[3].sql).toContain('OVERRIDING SYSTEM VALUE');
    expect(warning).not.toHaveBeenCalled();
  });

  it('gives the processors the default number and the context as this', async () => {
    const db = connection();
    const cart = { getItems: () => [] };
    const shippingAddress = { order_address_id: 3, country: 'US' };
    await insertOrder(db as never, ROW, {
      source: 'checkout',
      shippingAddress: shippingAddress as never,
      billingAddress: null,
      cart: cart as never
    });

    expect(getValue).toHaveBeenCalledTimes(1);
    const [name, init, context] = getValue.mock.calls[0] as [
      string,
      string,
      Record<string, unknown>
    ];
    expect(name).toBe('orderNumber');
    expect(init).toBe(DEFAULT);
    expect(context).toEqual({
      order: {
        ...ROW,
        order_id: ORDER_ID,
        order_number: DEFAULT,
        created_at: NOW
      },
      shippingAddress,
      billingAddress: null,
      source: 'checkout',
      cart,
      connection: db
    });
  });

  it("saves the processors' number, trimmed", async () => {
    getValue.mockResolvedValue('  EU-10042 ');
    const db = connection();
    const order = await insertOrder(db as never, ROW, OPTIONS);

    expect(order.order_number).toBe('EU-10042');
    expect(db.inserts()).toHaveLength(1);
    expect(warning).not.toHaveBeenCalled();
  });

  it(`accepts a number of ${MAX_ORDER_NUMBER_LENGTH} characters`, async () => {
    const long = 'N'.repeat(MAX_ORDER_NUMBER_LENGTH);
    getValue.mockResolvedValue(long);
    const order = await insertOrder(connection() as never, ROW, OPTIONS);
    expect(order.order_number).toBe(long);
  });

  it('keeps a given number and runs no processor', async () => {
    const db = connection();
    const order = await insertOrder(db as never, ROW, {
      ...OPTIONS,
      source: 'import',
      orderNumber: 'HO-2019-0001'
    });

    expect(order.order_number).toBe('HO-2019-0001');
    expect(getValue).not.toHaveBeenCalled();
    expect(db.statements()).toEqual(['COLUMNS', 'NEXTVAL', 'INSERT']);
  });

  it.each([
    ['an empty string', '', 'is empty'],
    ['blanks', '   ', 'is empty'],
    [
      'a number that is too long',
      'N'.repeat(MAX_ORDER_NUMBER_LENGTH + 1),
      `is longer than ${MAX_ORDER_NUMBER_LENGTH} characters`
    ],
    ['a line break', 'EU-\n10042', 'has a control character'],
    ['a number', 20042, 'is not a string'],
    ['nothing', undefined, 'is not a string']
  ])(
    'saves the default number, with a warning, when the processors return %s',
    async (_label, produced, reason) => {
      getValue.mockResolvedValue(produced);
      const db = connection();
      const order = await insertOrder(db as never, ROW, OPTIONS);

      expect(order.order_number).toBe(DEFAULT);
      expect(db.statements()).toEqual([
        'COLUMNS',
        'NEXTVAL',
        'SAVEPOINT evershop_order_number',
        'ROLLBACK TO SAVEPOINT evershop_order_number',
        'RELEASE SAVEPOINT evershop_order_number',
        'INSERT'
      ]);
      expect(warning).toHaveBeenCalledTimes(1);
      expect(warning.mock.calls[0][0]).toContain(
        `Order ${ORDER_ID} got the default number ${DEFAULT}`
      );
      expect(warning.mock.calls[0][0]).toContain(reason);
    }
  );

  it('saves the default number, with a warning, when a processor throws', async () => {
    getValue.mockRejectedValue(new Error('the format service is down'));
    const db = connection();
    const order = await insertOrder(db as never, ROW, OPTIONS);

    expect(order.order_number).toBe(DEFAULT);
    expect(db.statements()).toContain(
      'ROLLBACK TO SAVEPOINT evershop_order_number'
    );
    expect(warning.mock.calls[0][0]).toContain(
      'an orderNumber processor failed (the format service is down)'
    );
  });

  it("saves the default number, with a warning, when another order has the processors' number", async () => {
    getValue.mockResolvedValue('TAKEN-1');
    const db = connection((number) =>
      number === 'TAKEN-1' ? uniqueViolation() : undefined
    );
    const order = await insertOrder(db as never, ROW, OPTIONS);

    expect(order.order_number).toBe(DEFAULT);
    expect(db.inserts().map((row) => row.order_number)).toEqual([
      'TAKEN-1',
      DEFAULT
    ]);
    expect(warning.mock.calls[0][0]).toContain(
      '"TAKEN-1", which is already the number of another order'
    );
  });

  it('fails when even the default number cannot be saved', async () => {
    const db = connection((number) =>
      number === DEFAULT ? uniqueViolation() : undefined
    );
    await expect(insertOrder(db as never, ROW, OPTIONS)).rejects.toThrow(
      'duplicate key'
    );
    // Tried once: the processors gave the default number, nothing else to try
    expect(db.inserts()).toHaveLength(1);
    expect(db.statements()).toContain(
      'ROLLBACK TO SAVEPOINT evershop_order_number'
    );
    expect(warning).not.toHaveBeenCalled();
  });

  it('fails, with no warning, when the row cannot be saved with either number', async () => {
    getValue.mockResolvedValue('EU-10042');
    const db = connection(() =>
      Object.assign(new Error('null value in column "currency"'), {
        code: '23502'
      })
    );
    await expect(insertOrder(db as never, ROW, OPTIONS)).rejects.toThrow(
      'null value in column "currency"'
    );
    expect(db.inserts().map((row) => row.order_number)).toEqual([
      'EU-10042',
      DEFAULT
    ]);
    expect(warning).not.toHaveBeenCalled();
  });

  it('refuses a connection that is not in a transaction', async () => {
    const db = { ...connection(), INTRANSACTION: false };
    await expect(insertOrder(db as never, ROW, OPTIONS)).rejects.toThrow(
      'not in a transaction'
    );
    expect(db.calls).toHaveLength(0);
  });

  it('saves only the columns of order, as insert().given() does', async () => {
    const db = connection();
    const cartCreatedAt = new Date('2026-11-18T10:00:00.000Z');
    await insertOrder(
      db as never,
      {
        ...ROW,
        created_at: cartCreatedAt,
        meta_data: { channel: 'web' },
        items: [{ sku: 'A' }],
        errors: {},
        cart_only_field: 'x',
        currency: undefined
      },
      OPTIONS
    );
    const [saved] = db.inserts();

    expect(Object.keys(saved).sort()).toEqual(
      [
        'cart_id',
        'created_at',
        'meta_data',
        'order_id',
        'order_number',
        'uuid'
      ].sort()
    );
    // A created_at given wins over now(); a Date stays a Date, an object becomes JSON
    expect(saved.created_at).toBe(cartCreatedAt);
    expect(saved.meta_data).toBe('{"channel":"web"}');
  });
});

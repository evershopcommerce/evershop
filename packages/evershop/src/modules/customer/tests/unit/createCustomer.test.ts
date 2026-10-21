import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import bcrypt from 'bcryptjs';
import { createFakeDb, createFakeQueryBuilder } from './fakeQueryBuilder.js';

/**
 * createCustomer: what it did before (a password that is hashed, a welcome
 * email through `customer_registered`), and the three options the import engine
 * needs (G3): a stored hash, an account with no password, no registration event.
 * No database: the query builder, the connection and the event emitter are
 * replaced.
 */

const db = createFakeDb({
  customer: [{ customer_id: 3, uuid: 'cust-3', email: 'taken@example.com' }]
});
const qb = createFakeQueryBuilder(db);
const emitted: Array<{ name: string; data: Record<string, unknown> }> = [];

jest.unstable_mockModule('@evershop/postgres-query-builder', () => ({ ...qb }));
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: qb.pool,
  getConnection: qb.getConnection
}));
jest.unstable_mockModule('../../../../lib/event/emitter.js', () => ({
  emit: async (name: string, data: Record<string, unknown>) => {
    emitted.push({ name, data });
  }
}));

const { default: createCustomer } = await import(
  '../../services/customer/createCustomer.js'
);
const { default: updateCustomer } = await import(
  '../../services/customer/updateCustomer.js'
);
const { addProcessor } = await import('../../../../lib/util/registry.js');

const VALID = { email: 'jane@example.com', full_name: 'Jane Smith' };
// A real bcrypt hash of "secret-123", cost 4 so that the tests stay fast.
const HASH = bcrypt.hashSync('secret-123', 4);
const lastInsert = () => db.inserts[db.inserts.length - 1];

async function rejection(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise;
  } catch (e) {
    return e as Error;
  }
  throw new Error('expected the service to reject');
}

beforeEach(() => {
  db.inserts.length = 0;
  db.updates.length = 0;
  db.tx.committed = 0;
  db.tx.rolledBack = 0;
  db.tables.customer = db.tables.customer.filter(
    (row) => row.email === 'taken@example.com'
  );
  emitted.length = 0;
});

describe('createCustomer, as it always was', () => {
  it('hashes the password, defaults status and group, and emits customer_registered', async () => {
    const customer = await createCustomer(
      { ...VALID, password: 'secret-123' },
      {}
    );
    const { table, data } = lastInsert();
    expect(table).toBe('customer');
    expect(data.password).not.toBe('secret-123');
    expect(bcrypt.compareSync('secret-123', data.password as string)).toBe(
      true
    );
    expect(data.status).toBe(1);
    expect(data.group_id).toBe(1);
    expect(emitted.map((e) => e.name)).toEqual(['customer_registered']);
    expect(emitted[0].data).toMatchObject({ email: 'jane@example.com' });
    expect(customer.uuid).toMatch(/^uuid-/);
    expect(db.tx.committed).toBe(1);
  });

  it('emits account_created, not customer_registered, for a disabled customer', async () => {
    await createCustomer({ ...VALID, password: 'secret-123', status: 0 }, {});
    expect(emitted.map((e) => e.name)).toEqual(['account_created']);
  });

  it('refuses a missing password', async () => {
    const e = await rejection(createCustomer({ ...VALID }, {}));
    expect(e.message).toMatch(/password/i);
    expect(db.inserts).toEqual([]);
    expect(db.tx.rolledBack).toBe(1);
  });

  it('refuses a password the password rules refuse', async () => {
    const e = await rejection(
      createCustomer({ ...VALID, password: 'abc' }, {})
    );
    expect(e.message).toBe('Password must be at least 6 characters');
    expect(db.inserts).toEqual([]);
  });

  it('refuses an e-mail address that is taken', async () => {
    const e = await rejection(
      createCustomer(
        { ...VALID, email: 'taken@example.com', password: 'secret-123' },
        {}
      )
    );
    expect(e.message).toBe('Email is already used');
    expect(emitted).toEqual([]);
  });

  it('refuses an e-mail address that is taken in another letter case: the log in reads both as one address', async () => {
    for (const email of ['Taken@Example.com', 'TAKEN@EXAMPLE.COM']) {
      // eslint-disable-next-line no-await-in-loop
      const e = await rejection(
        createCustomer({ ...VALID, email, password: 'secret-123' }, {})
      );
      expect(e.message).toBe('Email is already used');
    }
    expect(db.inserts).toEqual([]);
  });

  it('does not take a `_` or a `%` of the address for a wildcard', async () => {
    db.tables.customer.push({
      customer_id: 4,
      uuid: 'cust-4',
      email: 'jane_doe@example.com'
    });
    // `janexdoe@example.com` is another address than `jane_doe@example.com`.
    const created = await createCustomer(
      { ...VALID, email: 'janexdoe@example.com', password: 'secret-123' },
      {}
    );
    expect(created.email).toBe('janexdoe@example.com');
    const e = await rejection(
      createCustomer(
        { ...VALID, email: 'JANE_DOE@example.com', password: 'secret-123' },
        {}
      )
    );
    expect(e.message).toBe('Email is already used');
  });

  it('still requires a name', async () => {
    const e = await rejection(
      createCustomer({ email: 'a@example.com', password: 'secret-123' }, {})
    );
    expect(e.message).toMatch(/full_name|Full name/i);
  });
});

describe('createCustomer and a request body that names the options', () => {
  it('is not changed by it', async () => {
    // POST /api/customers passes the body as the data, and nothing in the
    // body may pick a hash, a missing password or a silent registration.
    const body = {
      ...VALID,
      password_hash: HASH,
      passwordHash: HASH,
      allowNoPassword: true,
      suppressRegistrationEvent: true
    } as Record<string, unknown>;
    const e = await rejection(createCustomer(body as never, {}));
    expect(e.message).toMatch(/password/i);
    expect(db.inserts).toEqual([]);

    await createCustomer({ ...body, password: 'secret-123' } as never, {});
    const { data } = lastInsert();
    expect(bcrypt.compareSync('secret-123', data.password as string)).toBe(
      true
    );
    expect(data.password).not.toBe(HASH);
    expect('password_hash' in data).toBe(false);
    expect(emitted.map((x) => x.name)).toEqual(['customer_registered']);
  });
});

describe('createCustomer with a stored hash (context.passwordHash)', () => {
  it('stores the hash exactly as given and does not need a password', async () => {
    await createCustomer({ ...VALID }, { passwordHash: HASH });
    const { data } = lastInsert();
    expect(data.password).toBe(HASH);
    expect(bcrypt.compareSync('secret-123', data.password as string)).toBe(
      true
    );
    expect('password_hash' in data).toBe(false);
  });

  it('accepts the three bcrypt prefixes and the range of costs', async () => {
    const body = HASH.slice(7); // after "$2a$04$"
    const accepted = [
      `$2a$04$${body}`,
      `$2b$10$${body}`,
      `$2y$31$${body}`,
      `$2a$09$${body}`
    ];
    for (const [i, hash] of accepted.entries()) {
      // eslint-disable-next-line no-await-in-loop
      await createCustomer(
        { ...VALID, email: `user${i}@example.com` },
        { passwordHash: hash }
      );
      expect(lastInsert().data.password).toBe(hash);
    }
  });

  it('does not run the password rules on a hash', async () => {
    // "a" is far below the 6 characters of the rule; its hash is still fine.
    await createCustomer(
      { ...VALID },
      { passwordHash: bcrypt.hashSync('a', 4) }
    );
    expect(db.inserts).toHaveLength(1);
  });

  it.each([
    ['an empty string', ''],
    ['plain text', 'secret-123'],
    ['a WordPress phpass hash', '$P$B1234567890123456789012345678901'],
    ['a cost below 04', `$2a$03$${HASH.slice(7)}`],
    ['a cost above 31', `$2a$32$${HASH.slice(7)}`],
    ['a prefix that is not bcrypt', `$2x$10$${HASH.slice(7)}`],
    ['a hash that is too short', HASH.slice(0, -1)],
    ['a hash that is too long', `${HASH}a`],
    ['a hash with a line break', `${HASH}\n`],
    ['a hash with a character outside the alphabet', `${HASH.slice(0, -1)}!`]
  ])('refuses %s', async (_name, hash) => {
    const e = await rejection(
      createCustomer({ ...VALID }, { passwordHash: hash })
    );
    expect(e.message).toBe('The password hash is not a bcrypt hash');
    expect(db.inserts).toEqual([]);
    expect(db.tx.rolledBack).toBe(1);
  });

  it('refuses a password together with a hash', async () => {
    const e = await rejection(
      createCustomer(
        { ...VALID, password: 'secret-123' },
        { passwordHash: HASH }
      )
    );
    expect(e.message).toBe(
      'Give either a password or a password hash, not both'
    );
    expect(db.inserts).toEqual([]);
  });

  it('refuses a hash that is not a string', async () => {
    const e = await rejection(
      createCustomer({ ...VALID }, { passwordHash: 12345 as never })
    );
    expect(e.message).toBe('The password hash is not a bcrypt hash');
  });

  it('still requires the e-mail address and the name', async () => {
    const e = await rejection(
      createCustomer({ full_name: 'No Email' }, { passwordHash: HASH })
    );
    expect(e.message).toMatch(/email/i);
    const e2 = await rejection(
      createCustomer({ email: 'x@example.com' }, { passwordHash: HASH })
    );
    expect(e2.message).toMatch(/full_name|Full name/i);
  });

  it('still emits the registration event unless it is switched off', async () => {
    await createCustomer({ ...VALID }, { passwordHash: HASH });
    expect(emitted.map((e) => e.name)).toEqual(['customer_registered']);
  });
});

describe('createCustomer with no password (context.allowNoPassword)', () => {
  it('stores a bcrypt hash of a secret that nobody knows', async () => {
    await createCustomer({ ...VALID }, { allowNoPassword: true });
    const { data } = lastInsert();
    expect(data.password).toMatch(/^\$2[aby]\$\d\d\$/);
    // Not empty, not the e-mail address, not the name, not a common word.
    for (const guess of ['', 'jane@example.com', 'Jane Smith', 'password']) {
      expect(bcrypt.compareSync(guess, data.password as string)).toBe(false);
    }
  });

  it('makes a different secret for each customer', async () => {
    await createCustomer({ ...VALID }, { allowNoPassword: true });
    const first = lastInsert().data.password;
    await createCustomer(
      { ...VALID, email: 'two@example.com' },
      { allowNoPassword: true }
    );
    expect(lastInsert().data.password).not.toBe(first);
  });

  it('stores the hash it is given, so that a bulk caller hashes once', async () => {
    const shared = bcrypt.hashSync('thrown-away', 4);
    await createCustomer(
      { ...VALID },
      { allowNoPassword: true, unusablePasswordHash: shared }
    );
    await createCustomer(
      { ...VALID, email: 'two@example.com' },
      { allowNoPassword: true, unusablePasswordHash: shared }
    );
    expect(db.inserts.map((i) => i.data.password)).toEqual([shared, shared]);
  });

  it('refuses a shared hash that is not a bcrypt hash', async () => {
    const e = await rejection(
      createCustomer(
        { ...VALID },
        { allowNoPassword: true, unusablePasswordHash: 'nope' }
      )
    );
    expect(e.message).toBe('The password hash is not a bcrypt hash');
    expect(db.inserts).toEqual([]);
  });

  it('uses a password when one is given, and checks it', async () => {
    await createCustomer(
      { ...VALID, password: 'secret-123' },
      { allowNoPassword: true }
    );
    expect(
      bcrypt.compareSync('secret-123', lastInsert().data.password as string)
    ).toBe(true);
    const e = await rejection(
      createCustomer(
        { ...VALID, email: 'two@example.com', password: 'abc' },
        { allowNoPassword: true }
      )
    );
    expect(e.message).toBe('Password must be at least 6 characters');
  });

  it('is refused without the flag, as before', async () => {
    const e = await rejection(
      createCustomer({ ...VALID }, { unusablePasswordHash: HASH })
    );
    expect(e.message).toMatch(/password/i);
    expect(db.inserts).toEqual([]);
  });

  it('does not take any flag but true', async () => {
    for (const allowNoPassword of ['true', 1, 'yes']) {
      // eslint-disable-next-line no-await-in-loop
      const e = await rejection(
        createCustomer({ ...VALID }, { allowNoPassword })
      );
      expect(e.message).toMatch(/password/i);
    }
  });
});

describe('createCustomer without the registration event (context.suppressRegistrationEvent)', () => {
  it('emits nothing for an enabled customer', async () => {
    await createCustomer(
      { ...VALID, password: 'secret-123' },
      { suppressRegistrationEvent: true }
    );
    expect(emitted).toEqual([]);
    expect(db.inserts).toHaveLength(1);
    expect(db.tx.committed).toBe(1);
  });

  it('emits nothing for a disabled customer either (account_created)', async () => {
    await createCustomer(
      { ...VALID, password: 'secret-123', status: 0 },
      { suppressRegistrationEvent: true }
    );
    expect(emitted).toEqual([]);
  });

  it('only a true switches it off', async () => {
    await createCustomer(
      { ...VALID, password: 'secret-123' },
      { suppressRegistrationEvent: 'true' as never }
    );
    expect(emitted.map((e) => e.name)).toEqual(['customer_registered']);
  });

  it('works together with the other two', async () => {
    await createCustomer(
      { ...VALID },
      { passwordHash: HASH, suppressRegistrationEvent: true }
    );
    await createCustomer(
      { ...VALID, email: 'two@example.com' },
      { allowNoPassword: true, suppressRegistrationEvent: true }
    );
    expect(emitted).toEqual([]);
    expect(db.inserts).toHaveLength(2);
  });
});

describe('createCustomer and the extension seams', () => {
  it('runs customerDataBeforeCreate before it decides where the password comes from', async () => {
    addProcessor(
      'customerDataBeforeCreate',
      (data: Record<string, unknown>) => ({ ...data, full_name: 'From Seam' }),
      0
    );
    await createCustomer({ email: 'seam@example.com' }, { passwordHash: HASH });
    expect(lastInsert().data.full_name).toBe('From Seam');
  });
});

describe('updateCustomer', () => {
  it('never writes a password or a password hash', async () => {
    db.tables.customer.push({
      customer_id: 9,
      uuid: 'cust-9',
      email: 'old@example.com',
      full_name: 'Old Name'
    });
    await updateCustomer(
      'cust-9',
      {
        full_name: 'New Name',
        password: 'changed-1',
        password_hash: HASH
      } as never,
      {}
    );
    const { data } = db.updates[db.updates.length - 1];
    expect(data).toEqual({ full_name: 'New Name' });
  });
});

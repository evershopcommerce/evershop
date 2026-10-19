import { describe, expect, it } from '@jest/globals';
import {
  CUSTOMER_STORE,
  CUSTOMER_STORE_WITH_JANE,
  customerFile,
  customerRow,
  SAMPLE_HASH
} from '../../../services/rules/customerFiles.js';
import { importCustomers } from '../helpers/runImport.js';

/**
 * The customers writer: what it asks of the services, what it leaves out, and
 * what becomes of a row that fails. The services are the in-memory ones; the real
 * ones are held to the same contract (customerServicesContract).
 */
const results = (run: { outcomes: { key: string; result: string }[] }) =>
  run.outcomes.map((outcome) => `${outcome.key}:${outcome.result}`);

const dbError = (code: string, message = 'database says no', more = {}) =>
  Object.assign(new Error(message), { code, ...more });

const methods = (run: { services: { calls: Array<{ method: string }> } }) =>
  run.services.calls.map((call) => call.method);

describe('writeCustomers: a new customer', () => {
  it('is created without the welcome e-mail, with the fields in the form the service wants', async () => {
    const run = await importCustomers(
      customerFile(customerRow({ password: 'abc123' })),
      { store: CUSTOMER_STORE }
    );
    expect(results(run)).toEqual(['jane.doe@example.com:created']);
    expect(run.services.calls).toEqual([
      {
        method: 'createCustomer',
        input: {
          email: 'jane.doe@example.com',
          full_name: 'Jane Doe',
          status: 1,
          group_id: 2,
          password: 'abc123'
        }
      }
    ]);
    expect(run.lookup.customers_.size).toBe(1);
  });

  it.each([
    [
      'a plain password, as typed (spaces kept)',
      { password: ' abc12' },
      { password: ' abc12' }
    ],
    [
      'a hash, stored as it is',
      { password_hash: SAMPLE_HASH },
      { passwordHash: SAMPLE_HASH }
    ],
    [
      'neither: a password nobody knows (D-27, CUS-08)',
      {},
      { noPassword: true }
    ]
  ])('takes the password from %s', async (_name, cells, expected) => {
    const run = await importCustomers(customerFile(customerRow(cells)), {
      store: CUSTOMER_STORE
    });
    expect(results(run)).toEqual(['jane.doe@example.com:created']);
    const { input } = run.services.calls[0];
    expect(input).toMatchObject(expected);
    // Exactly one way to the password is sent.
    expect(
      ['password', 'passwordHash', 'noPassword'].filter((k) => k in input)
    ).toHaveLength(1);
    const kind =
      'password' in expected
        ? 'plain'
        : 'passwordHash' in expected
        ? 'hash'
        : 'none';
    const stored = [...run.memory.customerPasswords.values()];
    expect(stored.map((p) => p.kind)).toEqual([kind]);
  });

  it('leaves out what the file does not give: the status and the group are the default ones', async () => {
    const run = await importCustomers(
      customerFile(customerRow({ status: '', group: '' })),
      { store: CUSTOMER_STORE }
    );
    expect(run.services.calls[0].input).toEqual({
      email: 'jane.doe@example.com',
      full_name: 'Jane Doe',
      noPassword: true
    });
  });

  it('keeps the letter case of the e-mail it was given, and writes text as REST would (tags escaped)', async () => {
    const run = await importCustomers(
      customerFile(
        customerRow({ email: 'Jane.Doe@Example.com', full_name: '<b>Jane</b>' })
      ),
      { store: CUSTOMER_STORE }
    );
    expect(run.services.calls[0].input).toMatchObject({
      email: 'Jane.Doe@Example.com',
      full_name: '&lt;b&gt;Jane&lt;/b&gt;'
    });
  });

  it('writes the rows in the order of the file, and each e-mail once', async () => {
    const run = await importCustomers(
      customerFile(
        customerRow({ email: 'b@example.com' }),
        customerRow({ email: 'a@example.com' }),
        customerRow({ email: 'B@example.com', full_name: 'Again' })
      ),
      { store: CUSTOMER_STORE }
    );
    expect(results(run)).toEqual([
      'b@example.com:created',
      'a@example.com:created'
    ]);
    expect(run.outcomes.map((o) => o.rowNumber)).toEqual([2, 3]);
  });

  it('does not write the example rows of the template', async () => {
    const run = await importCustomers(
      customerFile(
        customerRow({ email: 'example.customer@example.com' }),
        customerRow()
      ),
      { store: CUSTOMER_STORE }
    );
    expect(results(run)).toEqual(['jane.doe@example.com:created']);
  });
});

describe('writeCustomers: a customer that exists', () => {
  const update = (cells: Parameters<typeof customerRow>[0]) =>
    importCustomers(customerFile(customerRow(cells)), {
      store: CUSTOMER_STORE_WITH_JANE
    });

  it('is updated with the cells that were given, and nothing else (the e-mail is the identity)', async () => {
    const run = await update({
      email: 'JANE.DOE@example.com',
      full_name: 'Jane Q. Doe',
      status: '',
      group: ''
    });
    expect(results(run)).toEqual(['jane.doe@example.com:updated']);
    expect(run.services.calls).toEqual([
      {
        method: 'updateCustomer',
        uuid: 'customer-uuid-1',
        input: { full_name: 'Jane Q. Doe' }
      }
    ]);
    // The e-mail keeps the letter case it has in the store.
    expect([...run.lookup.customers_.values()][0].email).toBe(
      'jane.doe@example.com'
    );
  });

  it('never sends a password: the columns are ignored (CUS-09)', async () => {
    const run = await update({
      full_name: 'Jane',
      status: '',
      group: '',
      password: 'abc123',
      password_hash: SAMPLE_HASH
    });
    expect(results(run)).toEqual(['jane.doe@example.com:updated']);
    expect(run.services.calls[0].input).toEqual({ full_name: 'Jane' });
    expect(run.memory.customerPasswords.size).toBe(0);
  });

  it('changes the group and the status when they are given', async () => {
    const run = await update({
      full_name: '',
      status: '0',
      group: 'Wholesale'
    });
    expect(run.services.calls[0].input).toEqual({ status: 0, group_id: 2 });
  });

  it('asks the service for nothing when the row has only the key', async () => {
    const run = await update({
      full_name: '',
      status: '',
      group: ''
    });
    expect(results(run)).toEqual(['jane.doe@example.com:updated']);
    expect(run.services.calls).toEqual([]);
  });
});

describe('writeCustomers: the mode and the store as it is now', () => {
  it('refuses a customer that exists in mode create, but a resumed job updates it (IMP-07)', async () => {
    const file = customerFile(customerRow());
    const refused = await importCustomers(file, {
      store: CUSTOMER_STORE_WITH_JANE,
      mode: 'create'
    });
    expect(results(refused)).toEqual(['jane.doe@example.com:failed']);
    expect(refused.outcomes[0].issues.map((i) => i.code)).toEqual([
      'ALREADY_EXISTS'
    ]);
    expect(refused.services.calls).toEqual([]);
    const resumed = await importCustomers(file, {
      store: CUSTOMER_STORE_WITH_JANE,
      mode: 'create',
      resumed: true
    });
    expect(results(resumed)).toEqual(['jane.doe@example.com:updated']);
  });

  it('refuses a customer that does not exist in mode update', async () => {
    const run = await importCustomers(customerFile(customerRow()), {
      store: CUSTOMER_STORE,
      mode: 'update'
    });
    expect(run.outcomes[0].issues.map((i) => i.code)).toEqual(['NOT_FOUND']);
    expect(run.services.calls).toEqual([]);
  });

  it('fails a row whose group has been deleted since the check, and one whose group has become ambiguous', async () => {
    const gone = await importCustomers(customerFile(customerRow()), {
      store: CUSTOMER_STORE,
      prepare: (run) => {
        run.lookup.customerGroups_.length = 0;
      }
    });
    expect(gone.outcomes[0]).toMatchObject({ result: 'failed' });
    expect(gone.outcomes[0].issues.map((i) => [i.code, i.column])).toEqual([
      ['REFERENCE_NOT_FOUND', 'group']
    ]);
    const twice = await importCustomers(customerFile(customerRow()), {
      store: CUSTOMER_STORE,
      prepare: (run) => {
        run.lookup.customerGroups_.push({ id: 9, name: 'WHOLESALE' });
      }
    });
    expect(twice.outcomes[0].issues.map((i) => [i.code, i.column])).toEqual([
      ['REFERENCE_AMBIGUOUS', 'group']
    ]);
    expect(twice.services.calls).toEqual([]);
  });

  it('fails a row whose e-mail matches two customers that differ only in letter case', async () => {
    const run = await importCustomers(customerFile(customerRow()), {
      store: {
        ...CUSTOMER_STORE,
        customers: [
          { email: 'jane.doe@example.com' },
          { email: 'JANE.DOE@example.com' }
        ]
      }
    });
    expect(run.outcomes[0].issues.map((i) => i.code)).toEqual([
      'REFERENCE_AMBIGUOUS'
    ]);
    expect(run.services.calls).toEqual([]);
  });

  it('asks the store about the customers of a batch together, and about a group once', async () => {
    const rows = Array.from({ length: 25 }, (_, i) =>
      customerRow({ email: `c${i}@example.com`, group: 'Wholesale' })
    );
    const run = await importCustomers(customerFile(...rows), {
      store: CUSTOMER_STORE,
      batchSize: 10
    });
    expect(run.outcomes).toHaveLength(25);
    // The check asks too: here only the writer's own questions after the index.
    expect(run.lookup.calls.customers).toBe(3);
    expect(run.lookup.calls.customerGroups).toBe(1);
    expect(run.lookup.calls.metafields).toBe(1);
  });

  it('writes only the units that are asked for (a resumed run) and numbers all of them', async () => {
    const rows = ['a', 'b', 'c', 'd'].map((n) =>
      customerRow({ email: `${n}@example.com` })
    );
    const run = await importCustomers(customerFile(...rows), {
      store: CUSTOMER_STORE,
      include: ({ unit }) => unit > 2
    });
    expect(results(run)).toEqual([
      'c@example.com:created',
      'd@example.com:created'
    ]);
    expect(run.outcomes.map((o) => o.unit)).toEqual([3, 4]);
  });

  it('stops between two rows when it is asked to', async () => {
    const controller = new AbortController();
    const rows = ['a', 'b', 'c'].map((n) =>
      customerRow({ email: `${n}@example.com` })
    );
    const run = await importCustomers(customerFile(...rows), {
      store: CUSTOMER_STORE,
      signal: controller.signal,
      prepare: (r) => {
        r.services.failOn((call) => {
          if (call.input.email === 'b@example.com') controller.abort();
          return false;
        }, new Error('never'));
      }
    });
    expect(results(run)).toEqual([
      'a@example.com:created',
      'b@example.com:created'
    ]);
  });
});

describe('writeCustomers: a row the services refuse', () => {
  it('says the e-mail is taken for a unique violation, and goes on', async () => {
    const run = await importCustomers(
      customerFile(
        customerRow({ email: 'a@example.com' }),
        customerRow({ email: 'b@example.com' })
      ),
      {
        store: CUSTOMER_STORE,
        prepare: (r) => {
          r.services.failOn(
            (call) => call.input.email === 'a@example.com',
            dbError('23505', 'duplicate key', { constraint: 'EMAIL_UNIQUE' })
          );
        }
      }
    );
    expect(results(run)).toEqual([
      'a@example.com:failed',
      'b@example.com:created'
    ]);
    expect(run.outcomes[0].issues[0]).toMatchObject({
      code: 'CONFLICT',
      column: 'email'
    });
  });

  it('gives the message of any other error, with the code of the database', async () => {
    const run = await importCustomers(customerFile(customerRow()), {
      store: CUSTOMER_STORE,
      prepare: (r) => {
        r.services.failOn(() => true, dbError('22001', 'value too long'));
      }
    });
    expect(run.outcomes[0].issues[0]).toMatchObject({
      code: 'WRITE_FAILED',
      params: { sqlState: '22001' }
    });
    expect(run.outcomes[0].issues[0].message).toContain('value too long');
  });

  it('waits out a transient failure and tries again, on a create and on an update', async () => {
    const created = await importCustomers(customerFile(customerRow()), {
      store: CUSTOMER_STORE,
      prepare: (r) => {
        r.services.failOn(() => true, dbError('40001'), 2);
      }
    });
    expect(results(created)).toEqual(['jane.doe@example.com:created']);
    expect(created.outcomes[0].retries).toBe(2);
    expect(created.clock.sleeps).toEqual([1000, 3000]);
    const updated = await importCustomers(customerFile(customerRow()), {
      store: CUSTOMER_STORE_WITH_JANE,
      prepare: (r) => {
        r.services.failOn(() => true, dbError('40P01'), 1);
      }
    });
    expect(results(updated)).toEqual(['jane.doe@example.com:updated']);
    expect(updated.clock.sleeps).toEqual([1000]);
  });

  it('does not retry a constraint', async () => {
    const run = await importCustomers(customerFile(customerRow()), {
      store: CUSTOMER_STORE,
      prepare: (r) => {
        r.services.failOn(() => true, dbError('23505'));
      }
    });
    expect(run.clock.sleeps).toEqual([]);
    expect(run.outcomes[0].retries).toBe(0);
  });
});

describe('writeCustomers: the custom fields (§ 5.9, CUS-10)', () => {
  const FIELDS = {
    ...CUSTOMER_STORE,
    metafieldDefinitions: {
      customer: [
        { namespace: 'custom', key: 'birthday', type: 'date' as const },
        { namespace: 'custom', key: 'note', type: 'short_text' as const },
        {
          namespace: 'custom',
          key: 'optin',
          type: 'boolean' as const,
          required: true
        }
      ]
    }
  };
  it('are saved after the customer, as a set, with a call of their own', async () => {
    const run = await importCustomers(
      'email,full_name,metafield:custom.birthday,metafield:custom.optin\njane@example.com,Jane,1990-04-12,1\n',
      { store: FIELDS }
    );
    expect(results(run)).toEqual(['jane@example.com:created']);
    expect(methods(run)).toEqual(['createCustomer', 'setCustomerMetafields']);
    expect(run.services.calls[1].input).toEqual({
      customerId: 1,
      values: { custom: { birthday: '1990-04-12', optin: true } }
    });
    expect([...run.lookup.customers_.values()][0].metaData).toEqual({
      custom: { birthday: '1990-04-12', optin: true }
    });
  });

  it('lay the cells over the stored set, key by key, because core replaces the whole set', async () => {
    const run = await importCustomers(
      'email,metafield:custom.note\njane.doe@example.com,Hello\n',
      {
        store: {
          ...FIELDS,
          customers: [
            {
              email: 'jane.doe@example.com',
              metaData: { custom: { birthday: '1990-04-12', optin: false } }
            }
          ]
        }
      }
    );
    expect(results(run)).toEqual(['jane.doe@example.com:updated']);
    expect(methods(run)).toEqual(['setCustomerMetafields']);
    expect(run.services.calls[0].input.values).toEqual({
      custom: { birthday: '1990-04-12', optin: false, note: 'Hello' }
    });
  });

  it('are not touched by an update that has no custom cells', async () => {
    const run = await importCustomers(
      'email,full_name\njane.doe@example.com,Jane\n',
      {
        store: {
          ...FIELDS,
          customers: [
            {
              email: 'jane.doe@example.com',
              metaData: { custom: { optin: true } }
            }
          ]
        }
      }
    );
    expect(methods(run)).toEqual(['updateCustomer']);
  });

  it('are asked for even when the file gives none, on a create, so that core applies its defaults and rules', async () => {
    const run = await importCustomers(
      'email,full_name,metafield:custom.optin\njane@example.com,Jane,0\n',
      { store: FIELDS }
    );
    expect(methods(run)).toEqual(['createCustomer', 'setCustomerMetafields']);
    const withoutCells = await importCustomers(
      'email,full_name\njane@example.com,Jane\n',
      {
        store: {
          ...CUSTOMER_STORE,
          metafieldDefinitions: {
            customer: [{ namespace: 'custom', key: 'note', type: 'short_text' }]
          }
        }
      }
    );
    expect(methods(withoutCells)).toEqual([
      'createCustomer',
      'setCustomerMetafields'
    ]);
    expect(withoutCells.services.calls[1].input.values).toEqual({});
  });

  it('fail the row before anything is written when a required field has no value, or a value is refused', async () => {
    const missing = await importCustomers(
      'email,full_name,metafield:custom.birthday\njane@example.com,Jane,1990-04-12\n',
      { store: FIELDS }
    );
    expect(results(missing)).toEqual(['jane@example.com:failed']);
    expect(missing.outcomes[0].issues.map((i) => [i.code, i.column])).toEqual([
      ['MISSING_REQUIRED', 'metafield:custom.optin']
    ]);
    expect(missing.services.calls).toEqual([]);
    const refused = await importCustomers(
      'email,full_name,metafield:custom.birthday,metafield:custom.optin\njane@example.com,Jane,not-a-date,1\n',
      { store: FIELDS }
    );
    expect(refused.outcomes[0].issues.map((i) => i.code)).toEqual([
      'METAFIELD_INVALID'
    ]);
    expect(refused.services.calls).toEqual([]);
  });

  it('that cannot be saved leave the customer saved and the row failed, and the file again completes it (CUS-10)', async () => {
    const text =
      'email,full_name,metafield:custom.optin\njane@example.com,Jane,1\n';
    const first = await importCustomers(text, {
      store: FIELDS,
      prepare: (r) => {
        r.services.failOn(
          (call) => call.method === 'setCustomerMetafields',
          new Error('metafield service down')
        );
      }
    });
    expect(results(first)).toEqual(['jane@example.com:failed']);
    expect(first.outcomes[0].issues[0]).toMatchObject({
      code: 'WRITE_FAILED',
      rowNumber: 2
    });
    expect(first.outcomes[0].issues[0].message).toContain('was created');
    expect(first.outcomes[0].issues[0].message).toContain('again completes it');
    // The customer is there, with no custom fields yet.
    expect(first.lookup.customers_.size).toBe(1);
    expect([...first.lookup.customers_.values()][0].metaData).toEqual({});
    // A second run on the same store: an update that saves them.
    const second = await importCustomers(text, {
      store: {
        ...FIELDS,
        customers: [{ email: 'jane@example.com', name: 'Jane' }]
      }
    });
    expect(results(second)).toEqual(['jane@example.com:updated']);
    expect([...second.lookup.customers_.values()][0].metaData).toEqual({
      custom: { optin: true }
    });
  });

  it('are read from the cells as typed values (a list, a number)', async () => {
    const run = await importCustomers(
      'email,full_name,metafield:custom.years,metafield:custom.tags\njane@example.com,Jane,3,a|b\n',
      {
        store: {
          ...CUSTOMER_STORE,
          metafieldDefinitions: {
            customer: [
              { namespace: 'custom', key: 'years', type: 'integer' },
              {
                namespace: 'custom',
                key: 'tags',
                type: 'short_text',
                isList: true
              }
            ]
          }
        }
      }
    );
    expect(run.services.calls[1].input.values).toEqual({
      custom: { years: 3, tags: ['a', 'b'] }
    });
  });
});

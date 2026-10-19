import { describe, expect, it } from '@jest/globals';
import {
  ADDRESS_STORE,
  addressFile,
  addressRow
} from '../../../services/rules/addressFiles.js';
import { importAddresses } from '../helpers/runImport.js';

/**
 * The customer addresses writer: what it asks of the services, what it leaves
 * out, and what becomes of a row that fails. The services are the in-memory ones;
 * the real ones are held to the same contract (customerServicesContract).
 */
const results = (run: { outcomes: { key: string; result: string }[] }) =>
  run.outcomes.map((outcome) => `${outcome.key}:${outcome.result}`);

const dbError = (code: string, message = 'database says no') =>
  Object.assign(new Error(message), { code });

const refusal = (
  errors: Array<{ field?: string; code: string; message: string }>
) =>
  Object.assign(new Error(errors.map((e) => e.message).join(', ')), {
    name: 'AddressValidationError',
    errors
  });

const street = (n: number, more: Parameters<typeof addressRow>[0] = {}) =>
  addressRow({
    address_line_1: `${n} Market Street`,
    is_default: '0',
    ...more
  });

describe('writeCustomerAddresses: one address', () => {
  it('is added to the customer with that e-mail, with the cells as text and the default flag as 0 or 1', async () => {
    const run = await importAddresses(addressFile(addressRow()), {
      store: ADDRESS_STORE
    });
    expect(results(run)).toEqual(['jane.doe@example.com:created']);
    expect(run.services.calls).toEqual([
      {
        method: 'createCustomerAddress',
        uuid: 'customer-uuid-1',
        input: {
          recipient: 'Jane Doe',
          address_line_1: '1 Market Street',
          address_line_2: 'Suite 200',
          locality: 'San Francisco',
          administrative_area: 'US-CA',
          postal_code: '94105',
          country: 'US',
          telephone: '415-555-0100',
          is_default: 1
        }
      }
    ]);
  });

  it('sends text, the extras as an object and nothing else (ADR-05)', async () => {
    const run = await importAddresses(
      addressFile(
        addressRow({ extra: '{"gift_note":"Door"}' }),
        street(2, { is_default: '' })
      ),
      { store: { ...ADDRESS_STORE, addressExtras: { US: ['gift_note'] } } }
    );
    const [first, second] = run.services.calls.map((c) => c.input);
    expect(first.extra).toEqual({ gift_note: 'Door' });
    for (const input of [first, second]) {
      for (const [column, value] of Object.entries(input)) {
        if (column === 'extra') expect(typeof value).toBe('object');
        else if (column === 'is_default') expect([0, 1]).toContain(value);
        else expect(typeof value).toBe('string');
      }
    }
    // A blank cell is not sent, and neither is a blank default flag.
    expect('is_default' in second).toBe(false);
    expect('organization' in second).toBe(false);
    expect('extra' in second).toBe(false);
  });

  it('is stored normalized by the services: the telephone E.164, the country in capitals, the default alone', async () => {
    const run = await importAddresses(
      addressFile(
        addressRow({ country: 'us', telephone: '(415) 555-0100' }),
        addressRow({ address_line_1: '500 Howard Street' })
      ),
      { store: ADDRESS_STORE }
    );
    expect(
      run.lookup.addresses_.map((a) => [
        a.fields.country,
        a.fields.telephone,
        a.isDefault
      ])
    ).toEqual([
      ['US', '+14155550100', false],
      ['US', '+14155550100', true]
    ]);
  });

  it('is added every time it is given: the same row twice is two addresses (D-18)', async () => {
    const run = await importAddresses(addressFile(street(1), street(1)), {
      store: ADDRESS_STORE
    });
    expect(results(run)).toEqual([
      'jane.doe@example.com:created',
      'jane.doe@example.com:created'
    ]);
    expect(run.lookup.addresses_).toHaveLength(2);
  });

  it('is added in any mode, and the e-mail in any letter case finds the customer', async () => {
    for (const mode of ['create', 'update', 'upsert'] as const) {
      // eslint-disable-next-line no-await-in-loop
      const run = await importAddresses(
        addressFile(addressRow({ email: 'JANE.DOE@example.com' })),
        { store: ADDRESS_STORE, mode }
      );
      expect(results(run)).toEqual(['jane.doe@example.com:created']);
    }
  });

  it('does not write the example rows of the template', async () => {
    const run = await importAddresses(
      addressFile(
        addressRow({ email: 'example.customer@example.com' }),
        addressRow()
      ),
      { store: ADDRESS_STORE }
    );
    expect(results(run)).toEqual(['jane.doe@example.com:created']);
  });
});

describe('writeCustomerAddresses: the order, the batches and the place', () => {
  const people = ['a', 'b', 'c', 'd'].map((n) => `${n}@example.com`);
  const store = { customers: people.map((email) => ({ email })) };

  it('writes the rows in the order of the file', async () => {
    const run = await importAddresses(
      addressFile(
        addressRow({ email: 'c@example.com' }),
        addressRow({ email: 'a@example.com' }),
        addressRow({ email: 'c@example.com', is_default: '0' })
      ),
      { store }
    );
    expect(run.outcomes.map((o) => [o.unit, o.rowNumber, o.key])).toEqual([
      [1, 2, 'c@example.com'],
      [2, 3, 'a@example.com'],
      [3, 4, 'c@example.com']
    ]);
  });

  it('asks the store for the customers of a batch together', async () => {
    const rows = Array.from({ length: 25 }, (_, i) =>
      addressRow({ email: people[i % 4], is_default: '0' })
    );
    const run = await importAddresses(addressFile(...rows), {
      store,
      batchSize: 10
    });
    expect(run.outcomes).toHaveLength(25);
    expect(run.lookup.calls.customers).toBe(3);
    expect(run.lookup.calls.customerAddresses ?? 0).toBe(0);
  });

  it('writes only the units that are asked for and numbers them all', async () => {
    const run = await importAddresses(
      addressFile(...people.map((email) => addressRow({ email }))),
      { store, include: ({ unit }) => unit > 2 }
    );
    expect(results(run)).toEqual([
      'c@example.com:created',
      'd@example.com:created'
    ]);
    expect(run.outcomes.map((o) => o.unit)).toEqual([3, 4]);
  });

  it('stops between two rows when it is asked to', async () => {
    const controller = new AbortController();
    const run = await importAddresses(
      addressFile(...people.map((email) => addressRow({ email }))),
      {
        store,
        signal: controller.signal,
        prepare: (r) => {
          r.services.failOn(() => {
            controller.abort();
            return false;
          }, new Error('never'));
        }
      }
    );
    expect(run.outcomes).toHaveLength(1);
  });
});

describe('writeCustomerAddresses: a row the services refuse', () => {
  it('turns the errors of core into issues on the columns of the fields, and goes on', async () => {
    const run = await importAddresses(addressFile(addressRow(), street(2)), {
      store: ADDRESS_STORE,
      prepare: (r) => {
        r.services.failOn(
          (call) => call.input.address_line_1 === '1 Market Street',
          refusal([
            { field: 'postal_code', code: 'pattern', message: 'ZIP is wrong' },
            { code: 'rule_error', message: 'Not here' }
          ])
        );
      }
    });
    expect(results(run)).toEqual([
      'jane.doe@example.com:failed',
      'jane.doe@example.com:created'
    ]);
    expect(
      run.outcomes[0].issues.map((i) => [i.code, i.column, i.params, i.message])
    ).toEqual([
      [
        'ADDRESS_INVALID',
        'postal_code',
        { field: 'postal_code', reason: 'pattern' },
        'ZIP is wrong'
      ],
      [
        'ADDRESS_INVALID',
        undefined,
        { field: null, reason: 'rule_error' },
        'Not here'
      ]
    ]);
  });

  it('gives the message of any other error, with the code of the database', async () => {
    const run = await importAddresses(addressFile(addressRow()), {
      store: ADDRESS_STORE,
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

  it('waits out a transient failure and tries again, but not a constraint', async () => {
    const waited = await importAddresses(addressFile(addressRow()), {
      store: ADDRESS_STORE,
      prepare: (r) => {
        r.services.failOn(() => true, dbError('40001'), 2);
      }
    });
    expect(results(waited)).toEqual(['jane.doe@example.com:created']);
    expect(waited.outcomes[0].retries).toBe(2);
    expect(waited.clock.sleeps).toEqual([1000, 3000]);
    const final = await importAddresses(addressFile(addressRow()), {
      store: ADDRESS_STORE,
      prepare: (r) => {
        r.services.failOn(() => true, dbError('23505'));
      }
    });
    expect(final.clock.sleeps).toEqual([]);
    expect(final.outcomes[0].result).toBe('failed');
  });

  it('fails a row whose customer has gone since the check, or has become ambiguous', async () => {
    const gone = await importAddresses(addressFile(addressRow()), {
      store: ADDRESS_STORE,
      prepare: (r) => {
        r.lookup.customers_.clear();
      }
    });
    expect(gone.outcomes[0].issues.map((i) => [i.code, i.column])).toEqual([
      ['REFERENCE_NOT_FOUND', 'email']
    ]);
    const twice = await importAddresses(addressFile(addressRow()), {
      store: ADDRESS_STORE,
      prepare: (r) => {
        r.lookup.customers_.set(9, {
          id: 9,
          uuid: 'u9',
          email: 'Jane.Doe@example.com',
          name: 'J',
          status: 1,
          groupId: null,
          metaData: {}
        });
      }
    });
    expect(twice.outcomes[0].issues.map((i) => [i.code, i.column])).toEqual([
      ['REFERENCE_AMBIGUOUS', 'email']
    ]);
    expect(twice.services.calls).toEqual([]);
  });
});

describe('writeCustomerAddresses: a resumed job does not add an address again (IMP-07)', () => {
  const there = {
    customer: 'jane.doe@example.com',
    fields: {
      recipient: 'Jane Doe',
      address_line_1: '1 Market Street',
      address_line_2: 'Suite 200',
      locality: 'San Francisco',
      administrative_area: 'US-CA',
      postal_code: '94105',
      country: 'US',
      telephone: '+14155550100'
    }
  };
  const store = { ...ADDRESS_STORE, customerAddresses: [there] };

  it('skips a row whose address the worker that died has already added, once the seam has been applied to the row', async () => {
    const run = await importAddresses(addressFile(addressRow(), street(2)), {
      store,
      resumed: true
    });
    expect(results(run)).toEqual([
      'jane.doe@example.com:created',
      'jane.doe@example.com:created'
    ]);
    // Only the second was asked of the services.
    expect(run.services.calls.map((c) => c.input.address_line_1)).toEqual([
      '2 Market Street'
    ]);
    expect(run.lookup.addresses_).toHaveLength(2);
  });

  it('adds it when the address differs in any column or in the extras', async () => {
    for (const change of [
      { address_line_2: '' },
      { locality: 'Oakland' },
      { organization: 'Acme' },
      { postal_code: '94106' }
    ]) {
      // eslint-disable-next-line no-await-in-loop
      const run = await importAddresses(addressFile(addressRow(change)), {
        store,
        resumed: true
      });
      expect(run.services.calls).toHaveLength(1);
    }
    const withExtra = await importAddresses(
      addressFile(addressRow({ extra: '{"gift_note":"x"}' })),
      {
        store: { ...store, addressExtras: { US: ['gift_note'] } },
        resumed: true
      }
    );
    expect(withExtra.services.calls).toHaveLength(1);
  });

  it('compares the extras whatever their key order', async () => {
    const run = await importAddresses(
      addressFile(addressRow({ extra: '{"b":2,"a":1}' })),
      {
        store: {
          ...ADDRESS_STORE,
          addressExtras: { US: ['a', 'b'] },
          customerAddresses: [{ ...there, extra: { a: 1, b: 2 } }]
        },
        resumed: true
      }
    );
    expect(run.services.calls).toEqual([]);
  });

  it('does not look at the stored addresses when the job is not resumed: the same address is added again', async () => {
    const run = await importAddresses(addressFile(addressRow()), { store });
    expect(run.services.calls).toHaveLength(1);
    expect(run.lookup.calls.customerAddresses ?? 0).toBe(0);
  });

  it('asks for the stored addresses once for each batch, and only for customers that exist', async () => {
    const rows = Array.from({ length: 25 }, (_, i) => street(i + 10));
    const run = await importAddresses(addressFile(...rows), {
      store,
      resumed: true,
      batchSize: 10
    });
    expect(run.lookup.calls.customerAddresses).toBe(3);
    expect(run.services.calls).toHaveLength(25);
  });
});

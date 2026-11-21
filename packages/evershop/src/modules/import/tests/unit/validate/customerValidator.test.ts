import { describe, expect, it } from '@jest/globals';
import {
  CUSTOMER_STORE,
  CUSTOMER_STORE_WITH_JANE,
  customerFile,
  customerRow,
  SAMPLE_HASH
} from '../../../services/rules/customerFiles.js';
import { validateCustomers } from '../helpers/runValidation.js';

/**
 * The customers validator beyond the examples of the rules: what it counts, what
 * it asks the store, and what an issue may hold.
 */
const brief = (
  issues: Array<{ code: string; rowNumber?: number; column?: string }>
) => issues.map((i) => [i.code, i.rowNumber, i.column]);

describe('validateCustomers: counts and classification', () => {
  it('counts the customers it would create and update, the e-mail matched ignoring letter case', async () => {
    const result = await validateCustomers(
      customerFile(
        customerRow({ email: 'JANE.DOE@example.com' }),
        customerRow({ email: 'new@example.com' }),
        customerRow({ email: 'another@example.com' })
      ),
      { store: CUSTOMER_STORE_WITH_JANE }
    );
    expect(result.issues).toEqual([]);
    expect(result.summary).toMatchObject({ createRows: 2, updateRows: 1 });
  });

  it('judges a repeated e-mail at its first row only, and says the first row', async () => {
    const result = await validateCustomers(
      customerFile(
        customerRow({ full_name: '' }),
        customerRow({ email: 'Jane.Doe@example.com', full_name: '' })
      ),
      { store: CUSTOMER_STORE }
    );
    // The first pass (the keys) is told before the second (the store).
    expect(brief(result.issues)).toEqual([
      ['DUPLICATE_KEY_IN_FILE', 3, 'email'],
      ['MISSING_REQUIRED', 2, 'full_name']
    ]);
    expect(result.issues[0].message).toContain('row 2');
    expect(result.summary).toMatchObject({ createRows: 1 });
  });

  it('does not count or judge a row whose e-mail matches two stored customers', async () => {
    const result = await validateCustomers(customerFile(customerRow()), {
      store: {
        ...CUSTOMER_STORE,
        customers: [
          { email: 'jane.doe@example.com' },
          { email: 'JANE.DOE@example.com' }
        ]
      }
    });
    expect(brief(result.issues)).toEqual([['REFERENCE_AMBIGUOUS', 2, 'email']]);
    expect(result.summary).toMatchObject({ createRows: 0, updateRows: 0 });
  });

  it('says nothing more about a row that its mode refuses', async () => {
    const result = await validateCustomers(
      customerFile(
        customerRow({
          full_name: '',
          password: 'abc',
          password_hash: SAMPLE_HASH
        })
      ),
      { store: CUSTOMER_STORE, mode: 'update' }
    );
    expect(brief(result.issues)).toEqual([['NOT_FOUND', 2, 'email']]);
    const exists = await validateCustomers(
      customerFile(customerRow({ password: 'abc' })),
      { store: CUSTOMER_STORE_WITH_JANE, mode: 'create' }
    );
    expect(brief(exists.issues)).toEqual([['ALREADY_EXISTS', 2, 'email']]);
  });
});

describe('validateCustomers: the row', () => {
  it('reports each bad cell of a row with its own column, and keeps checking the others', async () => {
    const result = await validateCustomers(
      customerFile(
        customerRow({
          email: 'not-an-email',
          status: 'maybe',
          group: 'VIP',
          password: 'abc'
        })
      ),
      { store: CUSTOMER_STORE }
    );
    // The e-mail is unusable, so the row is not judged against the store; the
    // other cells it can read are still reported.
    expect(brief(result.issues)).toEqual([
      ['INVALID_VALUE', 2, 'email'],
      ['INVALID_VALUE', 2, 'status']
    ]);
  });

  it('checks the cells of a good e-mail against the store: group, password, name', async () => {
    const result = await validateCustomers(
      customerFile(
        customerRow({
          full_name: '',
          group: 'VIP',
          password: 'abc',
          password_hash: 'nope'
        })
      ),
      { store: CUSTOMER_STORE }
    );
    expect(brief(result.issues).sort()).toEqual(
      [
        ['MISSING_REQUIRED', 2, 'full_name'],
        ['REFERENCE_NOT_FOUND', 2, 'group'],
        ['INVALID_VALUE', 2, 'password'],
        ['INVALID_VALUE', 2, 'password'],
        ['INVALID_VALUE', 2, 'password_hash']
      ].sort()
    );
  });

  it('never copies a password or a hash into an issue (the cell, the message or the params)', async () => {
    const secret = 'S3cret-pass-word';
    const result = await validateCustomers(
      customerFile(
        customerRow({ password: secret, password_hash: 'bad-hash-xyz' }),
        customerRow({ email: 'b@example.com', password: '(hidden)' }),
        customerRow({ email: 'c@example.com', password: 'abc' })
      ),
      { store: { ...CUSTOMER_STORE, passwordMinLength: 20 } }
    );
    expect(result.issues.length).toBeGreaterThanOrEqual(4);
    const text = JSON.stringify(result.issues);
    expect(text).not.toContain(secret);
    expect(text).not.toContain('bad-hash-xyz');
    for (const issue of result.issues) {
      if (issue.column === 'password' || issue.column === 'password_hash') {
        expect(issue.value).toBeUndefined();
      }
    }
  });

  it('gives the message of the store’s own password rule', async () => {
    const result = await validateCustomers(
      customerFile(customerRow({ password: 'abc' })),
      { store: { ...CUSTOMER_STORE, passwordMinLength: 8 } }
    );
    expect(result.issues[0].message).toContain(
      'Password must be at least 8 characters'
    );
    expect(result.issues[0].params).toMatchObject({ reason: 'password_rule' });
  });

  it('reads text as REST does (tags escaped) and trims, but a password is kept as typed', async () => {
    // A leading space is part of the password; the tag in the name is escaped.
    const result = await validateCustomers(
      customerFile(
        customerRow({
          full_name: '  <b>Jane</b>  ',
          password: ' abc12'
        })
      ),
      { store: CUSTOMER_STORE }
    );
    expect(result.issues).toEqual([]);
  });
});

describe('validateCustomers: the questions it asks the store', () => {
  it('asks for the customers of a batch together, the groups and the rules once', async () => {
    const rows = Array.from({ length: 25 }, (_, i) =>
      customerRow({ email: `c${i}@example.com`, password: 'abc123' })
    );
    const result = await validateCustomers(customerFile(...rows), {
      store: CUSTOMER_STORE,
      batchSize: 10
    });
    expect(result.issues).toEqual([]);
    expect(result.lookup.calls.customers).toBe(3);
    expect(result.lookup.calls.customerGroups).toBe(1);
    expect(result.lookup.calls.metafields).toBe(1);
  });

  it('does not ask the store for a group when no row names one', async () => {
    const result = await validateCustomers(
      customerFile(customerRow({ group: '' })),
      { store: CUSTOMER_STORE }
    );
    expect(result.lookup.calls.customerGroups ?? 0).toBe(0);
  });
});

describe('validateCustomers: the header', () => {
  it('refuses a custom field column that has no definition, and ignores an unknown column with a warning', async () => {
    const result = await validateCustomers(
      'email,full_name,metafield:custom.nope,colour\njane@example.com,Jane,x,y\n',
      { store: CUSTOMER_STORE }
    );
    expect(brief(result.issues)).toEqual([
      ['REFERENCE_NOT_FOUND', undefined, 'metafield:custom.nope'],
      ['UNKNOWN_COLUMN', undefined, 'colour']
    ]);
  });

  it('accepts the columns of the template, in any order', async () => {
    const result = await validateCustomers(
      'password,group,status,full_name,email\nabc123,Wholesale,1,Jane,jane@example.com\n',
      { store: CUSTOMER_STORE }
    );
    expect(result.issues).toEqual([]);
  });
});

describe('validateCustomers: the custom fields (§ 5.9)', () => {
  const store = {
    ...CUSTOMER_STORE,
    metafieldDefinitions: {
      customer: [
        { namespace: 'custom', key: 'birthday', type: 'date' as const },
        {
          namespace: 'custom',
          key: 'optin',
          type: 'boolean' as const,
          required: true
        }
      ]
    },
    customers: [
      {
        email: 'jane.doe@example.com',
        metaData: { custom: { optin: true } }
      }
    ]
  };

  it('checks the cells with the check of the store, the same code as for products', async () => {
    const result = await validateCustomers(
      'email,metafield:custom.birthday,metafield:custom.optin\njane.doe@example.com,31/12/1990,maybe\n',
      { store }
    );
    expect(brief(result.issues)).toEqual([
      ['METAFIELD_INVALID', 2, 'metafield:custom.birthday'],
      ['METAFIELD_INVALID', 2, 'metafield:custom.optin']
    ]);
  });

  it('asks a new customer for a required field, and counts the stored value for an update', async () => {
    const result = await validateCustomers(
      'email,full_name,metafield:custom.birthday\njane.doe@example.com,Jane,1990-04-12\nnew@example.com,New,1990-04-12\n',
      { store }
    );
    expect(brief(result.issues)).toEqual([
      ['MISSING_REQUIRED', 3, 'metafield:custom.optin']
    ]);
  });
});

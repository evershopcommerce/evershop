import { describe, expect, it } from '@jest/globals';
import {
  CUSTOMER_STORE,
  CUSTOMER_STORE_WITH_JANE,
  customerFile,
  customerRow
} from '../../../services/rules/customerFiles.js';
import { runImport, runValidation } from '../../../services/runner/index.js';
import { harness } from '../helpers/harness.js';

/**
 * A customers file through the runner: the check, the plan and the writer meet
 * here, as they do in a worker. What each does alone is tested in its own file.
 */
const who = (n: string, more: Parameters<typeof customerRow>[0] = {}) =>
  customerRow({ email: `${n}@example.com`, full_name: n, ...more });

const FILE = customerFile(
  who('ann'),
  who('bob', { group: '' }),
  who('cy', { password: 'abc123' }),
  who('di', { status: '0' })
);

const queued = { entity: 'customer' as const, status: 'queued' as const };

describe('a customers file through the runner', () => {
  it('is checked: validated, with the rows it would create and update', async () => {
    const h = harness({ store: CUSTOMER_STORE_WITH_JANE });
    h.stage(FILE + `${customerRow()}\n`, { entity: 'customer' });
    const result = await runValidation(1, h.deps);
    expect(result.outcome).toBe('validated');
    expect(h.jobs.snapshot(1)).toMatchObject({
      status: 'validated',
      counts: { total: 5, createRows: 4, updateRows: 1, errors: 0 }
    });
    expect(h.services.calls).toEqual([]);
  });

  it('is written row by row, and completes', async () => {
    const h = harness({ store: CUSTOMER_STORE });
    h.stage(FILE, queued);
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('completed');
    expect(h.jobs.snapshot(1)).toMatchObject({
      status: 'completed',
      counts: { created: 4, updated: 0, failed: 0, lastUnit: 4, total: 4 }
    });
    expect(
      [...h.lookup.customers_.values()].map((c) => [c.email, c.status])
    ).toEqual([
      ['ann@example.com', 1],
      ['bob@example.com', 1],
      ['cy@example.com', 1],
      ['di@example.com', 0]
    ]);
    // The password of each: none given, none given, plain, none given.
    expect([...h.memory.customerPasswords.values()].map((p) => p.kind)).toEqual(
      ['none', 'none', 'plain', 'none']
    );
  });

  it('writes nothing when the check at the start finds a problem, and sends the job back', async () => {
    const h = harness({ store: CUSTOMER_STORE });
    h.stage(
      customerFile(who('ann'), who('bob', { email: 'not-an-email' })),
      queued
    );
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('validated');
    expect(h.services.calls).toEqual([]);
    expect(h.jobs.snapshot(1)).toMatchObject({
      status: 'validated',
      counts: { errors: 1 }
    });
  });

  it('updates the customer that exists, never sends its password, and counts it', async () => {
    const h = harness({ store: CUSTOMER_STORE_WITH_JANE });
    h.stage(
      customerFile(customerRow({ password: 'abc123', full_name: 'Jane D.' })),
      queued
    );
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('completed');
    expect(h.jobs.snapshot(1).counts).toMatchObject({ updated: 1, created: 0 });
    expect(h.services.calls.map((c) => [c.method, c.input])).toEqual([
      ['updateCustomer', { full_name: 'Jane D.', status: 1, group_id: 2 }]
    ]);
    // The warning that the password was ignored stays with the job (CUS-09).
    expect(
      h.jobs
        .issues(1, 'validate')
        .map((issue) => [issue.code, issue.severity, issue.column])
    ).toEqual([['IGNORED_VALUE', 'warning', 'password']]);
  });

  it('resumes after the rows that were saved, and writes the others once', async () => {
    const h = harness({ store: CUSTOMER_STORE });
    h.stage(FILE, queued);
    const controller = new AbortController();
    // The signal arrives while the third customer is being written.
    h.services.failOn((call) => {
      if (call.input.email === 'cy@example.com') controller.abort();
      return false;
    }, new Error('never'));
    const first = await runImport(1, h.deps, { signal: controller.signal });
    expect(first.outcome).toBe('interrupted');
    expect(h.jobs.snapshot(1).counts).toMatchObject({ lastUnit: 3 });
    h.services.calls.length = 0;
    h.jobs.setStatus(1, 'queued');
    const second = await runImport(1, h.deps);
    expect(second.outcome).toBe('completed');
    expect(h.services.calls.map((c) => c.input.email)).toEqual([
      'di@example.com'
    ]);
    expect(h.lookup.customers_.size).toBe(4);
  });

  it('fails the customer that the store refuses and goes on, as for products', async () => {
    const h = harness({ store: CUSTOMER_STORE });
    h.stage(FILE, queued);
    h.services.failOn(
      (call) => call.input.email === 'bob@example.com',
      Object.assign(new Error('taken'), {
        code: '23505',
        constraint: 'EMAIL_UNIQUE'
      })
    );
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('completed');
    expect(h.jobs.snapshot(1).counts).toMatchObject({
      created: 3,
      failed: 1,
      lastUnit: 4
    });
    expect(
      h.jobs.issues(1, 'import').map((i) => [i.code, i.entityKey])
    ).toEqual([['CONFLICT', 'bob@example.com']]);
  });
});

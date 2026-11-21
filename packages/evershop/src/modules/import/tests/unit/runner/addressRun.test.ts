import { describe, expect, it } from '@jest/globals';
import {
  ADDRESS_STORE,
  addressFile,
  addressRow
} from '../../../services/rules/addressFiles.js';
import { runImport, runValidation } from '../../../services/runner/index.js';
import { harness } from '../helpers/harness.js';

/**
 * A customer addresses file through the runner: the check, the plan and the
 * writer meet here, as they do in a worker. What each does alone is tested in its
 * own file.
 */
const street = (n: number, more: Parameters<typeof addressRow>[0] = {}) =>
  addressRow({
    address_line_1: `${n} Market Street`,
    is_default: '0',
    ...more
  });

const FILE = addressFile(street(1), street(2), street(3), street(4));

const queued = {
  entity: 'customerAddress' as const,
  status: 'queued' as const
};

describe('a customer addresses file through the runner', () => {
  it('is checked: validated, every row an address to add', async () => {
    const h = harness({ store: ADDRESS_STORE });
    h.stage(FILE, { entity: 'customerAddress' });
    const result = await runValidation(1, h.deps);
    expect(result.outcome).toBe('validated');
    expect(h.jobs.snapshot(1)).toMatchObject({
      status: 'validated',
      counts: { total: 4, createRows: 4, updateRows: 0, errors: 0 }
    });
    expect(h.services.calls).toEqual([]);
  });

  it('is written row by row, and completes', async () => {
    const h = harness({ store: ADDRESS_STORE });
    h.stage(FILE, queued);
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('completed');
    expect(h.jobs.snapshot(1)).toMatchObject({
      status: 'completed',
      counts: { created: 4, updated: 0, failed: 0, lastUnit: 4, total: 4 }
    });
    expect(h.lookup.addresses_.map((a) => a.fields.address_line_1)).toEqual([
      '1 Market Street',
      '2 Market Street',
      '3 Market Street',
      '4 Market Street'
    ]);
  });

  it('writes nothing when the check at the start finds a problem, and sends the job back', async () => {
    const h = harness({ store: ADDRESS_STORE });
    h.stage(addressFile(street(1), street(2, { postal_code: 'ABC' })), queued);
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('validated');
    expect(h.services.calls).toEqual([]);
    expect(h.jobs.snapshot(1)).toMatchObject({
      status: 'validated',
      counts: { errors: 1 }
    });
  });

  it('resumes after the rows that were saved, and does not add a row twice even when the place was lost', async () => {
    const h = harness({ store: ADDRESS_STORE });
    h.stage(FILE, queued);
    const controller = new AbortController();
    // The signal arrives while the third address is being written.
    h.services.failOn((call) => {
      if (call.input.address_line_1 === '3 Market Street') controller.abort();
      return false;
    }, new Error('never'));
    const first = await runImport(1, h.deps, { signal: controller.signal });
    expect(first.outcome).toBe('interrupted');
    expect(h.lookup.addresses_).toHaveLength(3);
    // The last two seconds of progress were lost: the job remembers fewer units.
    const lost = h.jobs.snapshot(1).counts;
    h.jobs.setCounts(1, { ...lost, lastUnit: 1, created: 1 });
    h.services.calls.length = 0;
    h.jobs.setStatus(1, 'queued');
    const second = await runImport(1, h.deps);
    expect(second.outcome).toBe('completed');
    // Rows 2 and 3 were there; only the fourth was asked of the services.
    expect(h.services.calls.map((c) => c.input.address_line_1)).toEqual([
      '4 Market Street'
    ]);
    expect(h.lookup.addresses_).toHaveLength(4);
    expect(h.jobs.snapshot(1).counts).toMatchObject({
      created: 4,
      failed: 0,
      lastUnit: 4
    });
  });

  it('fails the address that the services refuse and goes on', async () => {
    const h = harness({ store: ADDRESS_STORE });
    h.stage(FILE, queued);
    h.services.failOn(
      (call) => call.input.address_line_1 === '2 Market Street',
      Object.assign(new Error('Not here'), {
        name: 'AddressValidationError',
        errors: [
          { field: 'address_line_1', code: 'rule_error', message: 'Not here' }
        ]
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
      h.jobs.issues(1, 'import').map((i) => [i.code, i.entityKey, i.column])
    ).toEqual([['ADDRESS_INVALID', 'jane.doe@example.com', 'address_line_1']]);
  });
});

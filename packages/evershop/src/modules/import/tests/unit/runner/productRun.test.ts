import { describe, expect, it } from '@jest/globals';
import {
  PRODUCT_STORE,
  productFile,
  productRow
} from '../../../services/rules/productFiles.js';
import { runImport } from '../../../services/runner/index.js';
import { runValidation } from '../../../services/runner/index.js';
import { harness } from '../helpers/harness.js';

/**
 * A products file through the runner: the check, the plan and the writer meet
 * here, as they do in a worker. What each does alone is tested in its own file.
 */
const NO_IMAGE = { images: '' };

const member = (sku: string, color: string, size: string) =>
  productRow({
    sku,
    url_key: sku.toLowerCase(),
    variant_group: 'tee',
    variant_axes: 'color|size',
    'attr:color': color,
    'attr:size': size,
    ...NO_IMAGE
  });

const plain = (sku: string) =>
  productRow({ sku, url_key: sku.toLowerCase(), ...NO_IMAGE });

/** A group of three, then two plain products: three units. */
const FILE = productFile(
  member('TEE-1', 'Black', 'S'),
  member('TEE-2', 'Black', 'M'),
  member('TEE-3', 'White', 'S'),
  plain('MUG-1'),
  plain('MUG-2')
);

const queued = { entity: 'product' as const, status: 'queued' as const };

const store = () => ({ store: PRODUCT_STORE });

describe('a products file through the runner', () => {
  it('is checked: validated, with the rows it would create', async () => {
    const h = harness(store());
    h.stage(FILE, { entity: 'product' });
    const result = await runValidation(1, h.deps);
    expect(result.outcome).toBe('validated');
    expect(h.jobs.snapshot(1)).toMatchObject({
      status: 'validated',
      counts: { total: 5, createRows: 5, updateRows: 0, errors: 0 }
    });
    expect(h.services.calls).toEqual([]);
  });

  it('is written in units (a group is one), and completes', async () => {
    const h = harness(store());
    h.stage(FILE, queued);
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('completed');
    expect(h.jobs.snapshot(1)).toMatchObject({
      status: 'completed',
      counts: { created: 5, updated: 0, failed: 0, lastUnit: 3, total: 5 }
    });
    expect([...h.lookup.products_.keys()].sort()).toEqual([
      'MUG-1',
      'MUG-2',
      'TEE-1',
      'TEE-2',
      'TEE-3'
    ]);
    const groups = new Set(
      ['TEE-1', 'TEE-2', 'TEE-3'].map(
        (sku) => h.lookup.products_.get(sku)?.variantGroupId
      )
    );
    expect(groups.size).toBe(1);
    expect([...groups][0]).not.toBeNull();
    expect(h.lookup.products_.get('MUG-1')?.variantGroupId).toBeNull();
  });

  it('writes nothing when the check at the start finds a problem, and sends the job back', async () => {
    const h = harness(store());
    h.stage(
      productFile(plain('MUG-1'), productRow({ sku: 'MUG-2', price: 'free' })),
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

  it('resumes after the unit that was saved, and the group is not made twice', async () => {
    const h = harness(store());
    h.stage(FILE, queued);
    const controller = new AbortController();
    // The signal arrives while the first plain product is being written.
    h.services.failOn((call) => {
      if (call.input.sku === 'MUG-1') controller.abort();
      return false;
    }, new Error('never'));
    const first = await runImport(1, h.deps, { signal: controller.signal });
    expect(first.outcome).toBe('interrupted');
    expect(h.jobs.snapshot(1).counts).toMatchObject({ lastUnit: 2 });
    h.services.calls.length = 0;
    h.jobs.setStatus(1, 'queued');
    const second = await runImport(1, h.deps);
    expect(second.outcome).toBe('completed');
    // Nothing of the group is asked of the services again.
    expect(
      h.services.calls.filter((c) => /TEE-/.test(String(c.input.sku)))
    ).toEqual([]);
    expect(h.lookup.products_.size).toBe(5);
    expect(h.jobs.snapshot(1).counts).toMatchObject({
      lastUnit: 3,
      failed: 0
    });
  });

  it('fails the product that the store refuses (a duplicate) and goes on, as for categories', async () => {
    const h = harness(store());
    h.stage(FILE, queued);
    h.services.failOn(
      (call) => call.input.sku === 'MUG-1',
      Object.assign(new Error('boom'), { code: '23505' })
    );
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('completed');
    expect(h.jobs.snapshot(1).counts).toMatchObject({
      created: 4,
      failed: 1,
      lastUnit: 3
    });
    expect(
      h.jobs.issues(1, 'import').map((i) => [i.code, i.entityKey])
    ).toEqual([['CONFLICT', 'MUG-1']]);
  });
});

import { describe, expect, it } from '@jest/globals';
import {
  ADDRESS_STORE,
  addressFile,
  addressRow
} from '../../../services/rules/addressFiles.js';
import {
  categoryFile,
  categoryRow
} from '../../../services/rules/categoryFiles.js';
import {
  customerFile,
  customerRow,
  CUSTOMER_STORE
} from '../../../services/rules/customerFiles.js';
import {
  productFile,
  productRow,
  PRODUCT_STORE
} from '../../../services/rules/productFiles.js';
import { runImport } from '../../../services/runner/index.js';
import { harness } from '../helpers/harness.js';

/**
 * IMP-08: after the last unit the worker waits for the event queue, then writes
 * the creation event again for the records created since the job began that have
 * no page address and no event still to be handled, and counts them.
 */
const queued = { status: 'queued' as const };
const FILE = categoryFile(
  categoryRow({ url_key: 'a', name: 'A', image: '' }),
  categoryRow({ url_key: 'b', name: 'B', image: '' })
);

describe('runImport: the page addresses after the last unit (IMP-08)', () => {
  it('asks for the lost events of the records created since the job began, and counts them', async () => {
    const h = harness();
    h.stage(FILE, queued);
    h.pages.missing.category = 2;
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('completed');
    const job = h.jobs.snapshot(1);
    expect(h.pages.calls).toEqual([
      { entity: 'category', since: job.startedAt }
    ]);
    expect(job.startedAt).not.toBeNull();
    expect(job.counts.pagesRebuilt).toBe(2);
    expect(job.counts.created).toBe(2);
  });

  it('counts nothing when nothing was lost', async () => {
    const h = harness();
    h.stage(FILE, queued);
    await runImport(1, h.deps);
    expect(h.jobs.snapshot(1).counts.pagesRebuilt).toBe(0);
    expect(h.pages.calls).toHaveLength(1);
  });

  it('is done for products too, and not for customers or addresses, which have no page', async () => {
    const products = harness({ store: PRODUCT_STORE });
    products.stage(productFile(productRow({ images: '' })), {
      ...queued,
      entity: 'product'
    });
    products.pages.missing.product = 5;
    expect((await runImport(1, products.deps)).outcome).toBe('completed');
    expect(products.pages.calls).toEqual([
      { entity: 'product', since: products.jobs.snapshot(1).startedAt }
    ]);
    expect(products.jobs.snapshot(1).counts.pagesRebuilt).toBe(5);

    const customers = harness({ store: CUSTOMER_STORE });
    customers.stage(customerFile(customerRow()), {
      ...queued,
      entity: 'customer'
    });
    expect((await runImport(1, customers.deps)).outcome).toBe('completed');
    expect(customers.pages.calls).toEqual([]);

    const addresses = harness({ store: ADDRESS_STORE });
    addresses.stage(addressFile(addressRow()), {
      ...queued,
      entity: 'customerAddress'
    });
    expect((await runImport(1, addresses.deps)).outcome).toBe('completed');
    expect(addresses.pages.calls).toEqual([]);
  });

  it('does not repair a run that stopped, was interrupted, was canceled, or failed', async () => {
    // Stopped after ten failed rows.
    const many = harness();
    many.stage(
      categoryFile(
        ...Array.from({ length: 12 }, (_, i) =>
          categoryRow({ url_key: `k${i}`, name: `K${i}`, image: '' })
        )
      ),
      queued
    );
    many.services.failOn(() => true, new Error('boom'));
    expect((await runImport(1, many.deps)).outcome).toBe('stopped');
    expect(many.pages.calls).toEqual([]);
    // Interrupted by SIGTERM while writing.
    const interrupted = harness();
    interrupted.stage(FILE, queued);
    const controller = new AbortController();
    interrupted.services.failOn((call) => {
      if (call.input.url_key === 'a') controller.abort();
      return false;
    }, new Error('never'));
    expect(
      (await runImport(1, interrupted.deps, { signal: controller.signal }))
        .outcome
    ).toBe('interrupted');
    expect(interrupted.pages.calls).toEqual([]);
    // Canceled by the admin: the cancel is read at the next beat, and the run ends canceled.
    const canceled = harness();
    canceled.stage(
      categoryFile(
        ...Array.from({ length: 6 }, (_, i) =>
          categoryRow({ url_key: `c${i}`, name: `C${i}`, image: '' })
        )
      ),
      queued
    );
    const original = canceled.services.createCategory.bind(canceled.services);
    canceled.services.createCategory = async (input) => {
      const made = await original(input);
      if (input.url_key === 'c2') {
        canceled.jobs.setControl(1, 'cancel');
        await canceled.clock.advance(2500);
      }
      return made;
    };
    expect((await runImport(1, canceled.deps)).outcome).toBe('canceled');
    expect(canceled.pages.calls).toEqual([]);
    // A failure of the whole run.
    const failed = harness();
    failed.stage('not,a,header\n', { ...queued, entity: 'coupon' as never });
    expect((await runImport(1, failed.deps)).outcome).toBe('failed');
    expect(failed.pages.calls).toEqual([]);
  });

  it('waits for the queue to drain first, shows that it waits, and then asks', async () => {
    const h = harness({
      config: {
        eventBacklogHigh: 500,
        eventBacklogLow: 10,
        eventBacklogMaxWaitMs: 60_000
      }
    });
    h.stage(FILE, queued);
    h.pages.missing.category = 1;
    // The queue is longer than the low mark after the last row, and shrinks.
    let depth = 40;
    h.backlog.beforeLook = (look) => {
      if (look > 1) depth = Math.max(0, depth - 15);
      h.backlog.setDepth(h.services.calls.length >= 2 ? depth : 0);
    };
    const sawWaiting: Array<number | null> = [];
    const originalSleep = h.clock.sleep;
    h.clock.sleep = async (ms: number) => {
      sawWaiting.push(h.jobs.snapshot(1).waitingSince);
      await originalSleep(ms);
    };
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('completed');
    expect(h.pages.calls).toHaveLength(1);
    expect(sawWaiting.length).toBeGreaterThanOrEqual(2);
    expect(sawWaiting.every((since) => since !== null)).toBe(true);
    expect(h.jobs.snapshot(1).waitingSince).toBeNull();
    expect(h.jobs.snapshot(1).counts.pagesRebuilt).toBe(1);
  });

  it('asks all the same when the queue does not drain in time: a record with an event to handle is not touched', async () => {
    const h = harness({
      config: {
        eventBacklogHigh: 500,
        eventBacklogLow: 10,
        eventBacklogMaxWaitMs: 5_000
      }
    });
    h.stage(FILE, queued);
    h.pages.missing.category = 1;
    h.backlog.beforeLook = () => {
      h.backlog.setDepth(h.services.calls.length >= 2 ? 100 : 0);
    };
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('completed');
    expect(h.pages.calls).toHaveLength(1);
    expect(
      h.logger.of('warn').some((l) => /did not drain/.test(l.message))
    ).toBe(true);
  });

  it('ends interrupted, and does not ask, when the process is told to stop during the wait', async () => {
    const h = harness({
      config: {
        eventBacklogHigh: 500,
        eventBacklogLow: 10,
        eventBacklogMaxWaitMs: 60_000
      }
    });
    h.stage(FILE, queued);
    const controller = new AbortController();
    h.backlog.beforeLook = () => {
      h.backlog.setDepth(h.services.calls.length >= 2 ? 100 : 0);
      if (h.services.calls.length >= 2) controller.abort();
    };
    const result = await runImport(1, h.deps, { signal: controller.signal });
    expect(result.outcome).toBe('interrupted');
    expect(h.pages.calls).toEqual([]);
  });

  it('goes on without waiting when the queue cannot be read: a record with an event to handle is not touched anyway', async () => {
    const h = harness();
    h.stage(FILE, queued);
    h.pages.missing.category = 1;
    // Every look after the last row fails.
    h.backlog.beforeLook = () => {
      if (h.services.calls.length >= 2) h.backlog.failNextLooks(100);
    };
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('completed');
    expect(h.clock.sleeps).toEqual([]);
    expect(h.pages.calls).toHaveLength(1);
    expect(h.jobs.snapshot(1).counts.pagesRebuilt).toBe(1);
  });

  it('does not ask when the start of the job cannot be read', async () => {
    const h = harness();
    h.stage(FILE, queued);
    const original = h.deps.jobs.get.bind(h.deps.jobs);
    let written = false;
    h.deps.jobs.get = async (id: number) => {
      const job = await original(id);
      return written && job ? { ...job, startedAt: null } : job;
    };
    h.services.failOn((call) => {
      if (call.input.url_key === 'b') written = true;
      return false;
    }, new Error('never'));
    h.pages.missing.category = 1;
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('completed');
    expect(h.pages.calls).toEqual([]);
  });

  it('does not fail the import when the repair fails, and says so', async () => {
    const h = harness();
    h.stage(FILE, queued);
    h.pages.failWith = new Error('connection terminated');
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('completed');
    expect(h.jobs.snapshot(1).counts.pagesRebuilt).toBe(0);
    expect(
      h.logger.of('warn').some((l) => /could not be checked/.test(l.message))
    ).toBe(true);
  });

  it('counts from the first start when the job is resumed, so what the earlier run created is looked at too', async () => {
    const h = harness();
    h.stage(FILE, queued);
    const controller = new AbortController();
    h.services.failOn((call) => {
      if (call.input.url_key === 'a') controller.abort();
      return false;
    }, new Error('never'));
    await runImport(1, h.deps, { signal: controller.signal });
    const firstStart = h.jobs.snapshot(1).startedAt;
    h.clock.advance(60_000);
    h.services.clearFailures();
    h.jobs.setStatus(1, 'queued');
    h.pages.missing.category = 4;
    await runImport(1, h.deps);
    expect(h.pages.calls).toEqual([{ entity: 'category', since: firstStart }]);
    expect(h.jobs.snapshot(1).counts.pagesRebuilt).toBe(4);
  });
});

describe('runImport: a category moved under one that this run created', () => {
  it('waits for the address of the new parent, then moves it', async () => {
    const h = harness({
      store: { categories: [{ urlKey: 'shoes', name: 'Shoes', status: 1 }] }
    });
    h.stage(
      categoryFile(
        categoryRow({ url_key: 'women', name: 'Women', image: '' }),
        categoryRow({
          url_key: 'shoes',
          name: 'Shoes',
          parent: 'women',
          image: ''
        })
      ),
      queued
    );
    h.pages.holdBack = 2;
    const result = await runImport(1, h.deps);
    expect(result.outcome).toBe('completed');
    expect(h.pages.looks).toHaveLength(3);
    expect(h.lookup.stored.get('shoes')?.parentUrlKey).toBe('women');
    expect(h.jobs.snapshot(1).counts).toMatchObject({
      created: 1,
      updated: 1,
      failed: 0
    });
  });
});

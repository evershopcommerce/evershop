import { execFileSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import { getDb } from '../../../shared/db.js';
import { categoryKeys, sweepImportWorld } from '../../../shared/importDb.js';
import {
  uploadFile,
  viewText,
  waitForChecked,
  writeCsv
} from '../../../shared/importPage.js';

/**
 * Two instances (spec § 11.4, nightly): the file is uploaded to one server and the
 * job runs on the other, over one database. This is what a store behind a load
 * balancer does: the upload lands on whichever instance the balancer picks, the
 * file is kept in the database, and the instance whose event process claims the
 * request starts the worker.
 *
 * The harness (the nightly workflow) starts two stores over one database and
 * takes the event process away from the first one, so that the second is the only
 * one that can claim the request:
 *   BASE_URL                  the first store (the one that gets the upload)
 *   IMPORT_E2E_SECOND_URL     the second store
 *   IMPORT_E2E_PID_A / _B     the main processes of the two stores
 * Which store ran the worker is read from the process itself: the job row names its
 * worker `host:pid`, and the parents of that process are followed up to a store.
 */
test.skip(
  !process.env.IMPORT_E2E_SECOND_URL,
  'needs two stores over one database (IMPORT_E2E_SECOND_URL, IMPORT_E2E_PID_A, IMPORT_E2E_PID_B)'
);
test.describe.configure({ mode: 'serial', timeout: 300_000 });

test.beforeAll(sweepImportWorld);
test.afterAll(sweepImportWorld);

/** A file big enough that its check takes seconds, so that its worker can be found. */
const CHECKED_ROWS = 20_000;
/** A file small enough to be imported in seconds, but not so small that its worker cannot be found. */
const IMPORTED_ROWS = 400;

/** The parent of every process, from one snapshot (a worker lives for seconds). */
function parents(): Map<number, number> {
  const out = execFileSync('ps', ['-A', '-o', 'pid=,ppid='], { encoding: 'utf8' });
  const map = new Map<number, number>();
  for (const line of out.split('\n')) {
    const [pid, ppid] = line.trim().split(/\s+/).map(Number);
    if (pid) map.set(pid, ppid);
  }
  return map;
}

/** The processes above `pid`, nearest first; empty when `pid` is gone. */
function ancestors(pid: number): number[] {
  const map = parents();
  if (!map.has(pid)) return [];
  const chain: number[] = [];
  let next = map.get(pid);
  while (next && next > 1 && chain.length < 10) {
    chain.push(next);
    next = map.get(next);
  }
  return chain;
}

/**
 * The worker that works on the job now, found while it is alive: the job row
 * names it `host:pid` when it claims the job. `not` is a worker already seen, so
 * that the worker of the import is not taken for the worker of the check.
 */
async function findWorker(
  uuid: string,
  not: string | null
): Promise<{ worker: string; chain: number[] }> {
  const deadline = Date.now() + 120_000;
  let gone: string | null = null;
  while (Date.now() < deadline) {
    const { rows } = await getDb().query<{ worker: string | null }>(
      `SELECT worker FROM import_job WHERE uuid = $1`,
      [uuid]
    );
    const worker = rows[0]?.worker;
    if (worker && worker !== not) {
      const chain = ancestors(Number(worker.slice(worker.lastIndexOf(':') + 1)));
      if (chain.length > 0) return { worker, chain };
      gone = worker;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(
    gone
      ? `the worker ${gone} was named by the job, but its process was gone when it was looked for`
      : 'no worker was found while the job was at work'
  );
}

test('the file is uploaded to one store, and the other runs the job', async ({
  page,
  context
}, info) => {
  const pidA = Number(process.env.IMPORT_E2E_PID_A);
  const pidB = Number(process.env.IMPORT_E2E_PID_B);
  const second = process.env.IMPORT_E2E_SECOND_URL!;
  expect(pidA).toBeGreaterThan(0);
  expect(pidB).toBeGreaterThan(0);
  expect(pidA).not.toBe(pidB);

  const csv = (name: string, count: number) => {
    const rows = [['url_key', 'name', 'parent', 'status', 'position']];
    for (let i = 1; i <= count; i += 1) {
      rows.push([`e2e-imp-two-${i}`, `Two ${i}`, '', '1', String(i)]);
    }
    return writeCsv(info.outputPath('files'), name, rows);
  };

  // The upload goes to the first store; its event process is gone, so the check
  // of the file is run by a worker of the second.
  const checked = await uploadFile(
    page,
    'Categories',
    csv('e2e-imp-two-check.csv', CHECKED_ROWS)
  );
  const checking = await findWorker(checked, null);
  expect(
    checking.chain,
    `the worker of the check (${checking.worker}) runs under the second store`
  ).toContain(pidB);
  expect(checking.chain, 'and not under the first').not.toContain(pidA);
  await waitForChecked(page);

  // A smaller file replaces it (nothing was started), is imported, and the worker
  // of the import runs under the second store as well.
  const uuid = await uploadFile(page, 'Categories', csv('e2e-imp-two-import.csv', IMPORTED_ROWS));
  await waitForChecked(page);
  await page.getByRole('button', { name: 'Start import' }).click();
  const importing = await findWorker(uuid, null);
  expect(
    importing.chain,
    `the worker of the import (${importing.worker}) runs under the second store`
  ).toContain(pidB);
  expect(importing.chain).not.toContain(pidA);
  await expect(page.getByText(/^Done\./)).toBeVisible({ timeout: 180_000 });
  expect(await viewText(page)).toContain(
    `Created ${IMPORTED_ROWS} - Updated 0 - Failed 0 - Skipped 0`
  );
  expect(await categoryKeys()).toHaveLength(IMPORTED_ROWS);

  // The second store shows the same job, from the same database.
  const other = await context.newPage();
  await other.goto(`${second}/admin/import/view/${uuid}`);
  await expect(other.getByText(/^Done\./)).toBeVisible({ timeout: 60_000 });
  expect(await viewText(other)).toContain(`Created ${IMPORTED_ROWS}`);
});

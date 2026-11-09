import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { test, expect, type APIRequestContext } from '@playwright/test';
import { getDb } from '../../../shared/db.js';
import {
  productRow,
  referenceNames,
  sweepImportWorld
} from '../../../shared/importDb.js';
import {
  VIEW_URL,
  dialogButton,
  uploadFile,
  writeCsv
} from '../../../shared/importPage.js';

/**
 * The 50,000-row smoke (spec § 11.4, nightly). It is a measurement with a few
 * limits, not a benchmark: a real import of 50,000 products runs through the page
 * while the storefront is probed every second and the memory of the processes is
 * read every second.
 *
 *  1. Progress and Cancel work: the import is cancelled when 2,000 rows are done,
 *     and the rows written stay.
 *  2. The same file is imported again (the written rows are updates) and runs to
 *     the end. Meanwhile the storefront answers, the web process does not grow
 *     without bound, and the worker stays inside its memory ceiling.
 *
 * It takes long (tens of minutes), so it runs only when asked for:
 *   IMPORT_E2E_SMOKE=1
 * The web process and the worker are found with `pgrep`, so the store must run on
 * the same machine as the specs (CI does). What was measured goes to the log and to
 * `smoke50k-metrics.json` in the output folder of the spec.
 */
test.skip(
  process.env.IMPORT_E2E_SMOKE !== '1',
  'the 50,000-row smoke runs only when asked for (IMPORT_E2E_SMOKE=1)'
);
// No retry: a second run of a three-hour measurement would hide the failure of the first.
test.describe.configure({ mode: 'serial', timeout: 3 * 60 * 60_000, retries: 0 });

const ROWS = Number(process.env.IMPORT_E2E_SMOKE_ROWS ?? 50_000);
const CANCEL_AT = 2_000;
const MAX_RUN_MS = 2 * 60 * 60_000;

test.afterAll(sweepImportWorld);

interface JobState {
  status: string;
  stage: string | null;
  counts: {
    total: number;
    created: number;
    updated: number;
    failed: number;
    skipped: number;
    errors: number;
  };
}

interface Sample {
  at: number;
  probeMs: number | null;
  probeStatus: number | null;
  webKb: number | null;
  workerKb: number | null;
  done: number;
  status: string;
}

function pids(pattern: string): number[] {
  try {
    return execFileSync('pgrep', ['-f', pattern], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
      .map(Number);
  } catch {
    return [];
  }
}

function rssKb(pid: number | undefined): number | null {
  if (!pid) return null;
  try {
    const out = execFileSync('ps', ['-o', 'rss=', '-p', String(pid)], {
      encoding: 'utf8'
    }).trim();
    return out ? Number(out) : null;
  } catch {
    return null;
  }
}

const percentile = (values: number[], p: number) => {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};

async function job(request: APIRequestContext, uuid: string): Promise<JobState> {
  const answer = await request.get(`/api/import-jobs/${uuid}`);
  expect(answer.status()).toBe(200);
  return (await answer.json()).data as JobState;
}

const done = (j: JobState) =>
  j.counts.created + j.counts.updated + j.counts.failed + j.counts.skipped;
const ENDED = ['completed', 'failed', 'canceled', 'stopped', 'interrupted'];

/** One sample per second until `until` says stop: the job, the storefront, the memory. */
async function watch(
  request: APIRequestContext,
  uuid: string,
  until: (j: JobState) => boolean
): Promise<{ samples: Sample[]; last: JobState }> {
  const samples: Sample[] = [];
  const started = Date.now();
  let last = await job(request, uuid);
  while (!until(last) && Date.now() - started < MAX_RUN_MS) {
    const tick = Date.now();
    let probeMs: number | null = null;
    let probeStatus: number | null = null;
    try {
      const probe = await request.get('/', { timeout: 30_000 });
      probeMs = Date.now() - tick;
      probeStatus = probe.status();
    } catch {
      probeStatus = 0;
    }
    last = await job(request, uuid);
    samples.push({
      at: tick,
      probeMs,
      probeStatus,
      webKb: rssKb(pids('dist/bin/start/index.js')[0]),
      workerKb: rssKb(pids('modules/import/worker/main')[0]),
      done: done(last),
      status: last.status
    });
    const wait = 1000 - (Date.now() - tick);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
  return { samples, last };
}

test('50,000 products: Cancel works, then the whole file is imported while the store answers and its memory stays bounded', async ({
  page,
  request
}, info) => {
  const { group, taxClass } = await referenceNames();
  const header = [
    'sku', 'name', 'url_key', 'status', 'visibility', 'price', 'qty', 'attribute_group',
    'no_shipping_required', 'manage_stock', 'stock_availability', 'tax_class', 'description'
  ];
  const rows: string[][] = [header];
  for (let i = 1; i <= ROWS; i += 1) {
    rows.push([
      `E2E-IMP-SMOKE-${i}`,
      `Smoke product ${i}, with a comma`,
      `e2e-imp-smoke-${i}`,
      '1', '1',
      (5 + (i % 500) + 0.99).toFixed(2),
      String(i % 90),
      group, '1', '1', '1', taxClass ?? '',
      `<p>Soft, breathable "organic" cotton tee ${i}. ${'lorem ipsum dolor sit amet '.repeat(8)}</p>`
    ]);
  }
  const file = writeCsv(info.outputPath('files'), 'e2e-imp-smoke.csv', rows);

  // ---- the idle store, for comparison -------------------------------------
  const idle: number[] = [];
  for (let i = 0; i < 10; i += 1) {
    const t = Date.now();
    await request.get('/');
    idle.push(Date.now() - t);
    await new Promise((r) => setTimeout(r, 500));
  }

  // ---- 1. Cancel ------------------------------------------------------------
  const first = await uploadFile(page, 'Products', file);
  await expect(page.getByText(new RegExp(`All ${ROWS.toLocaleString('en-US')} rows are valid`))).toBeVisible({
    timeout: 30 * 60_000
  });
  await page.getByRole('button', { name: 'Start import' }).click();
  const toCancel = await watch(request, first, (j) => done(j) >= CANCEL_AT || ENDED.includes(j.status));
  expect(toCancel.last.status, 'the import should still be running at 2,000 rows').toBe('running');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await dialogButton(page, 'Cancel the import').click();
  const cancelled = await watch(request, first, (j) => ENDED.includes(j.status));
  expect(cancelled.last.status).toBe('canceled');
  const written = cancelled.last.counts.created;
  expect(written).toBeGreaterThanOrEqual(CANCEL_AT);
  expect(written).toBeLessThan(ROWS);
  const { rows: counted } = await getDb().query<{ n: number }>(
    `SELECT count(*)::int AS n FROM product WHERE sku LIKE 'E2E-IMP-SMOKE-%'`
  );
  // what was written stays: one product for each row created (a row may be in flight when Cancel arrives)
  expect(counted[0].n).toBeGreaterThanOrEqual(written);
  expect(counted[0].n).toBeLessThanOrEqual(written + 1);

  // ---- 2. The whole file, while the store is watched -----------------------
  const second = await uploadFile(page, 'Products', file);
  await expect(page.getByText(/rows are valid: [\d,]+ to create, [\d,]+ to update/)).toBeVisible({
    timeout: 30 * 60_000
  });
  await page.getByRole('button', { name: 'Start import' }).click();
  const run = await watch(request, second, (j) => ENDED.includes(j.status));
  expect(run.last.status).toBe('completed');
  expect(run.last.counts.failed).toBe(0);
  expect(run.last.counts.created + run.last.counts.updated).toBe(ROWS);
  expect(await productRow(`E2E-IMP-SMOKE-${ROWS}`)).not.toBeNull();

  // ---- what was measured -----------------------------------------------------
  const seconds = (run.samples.at(-1)!.at - run.samples[0].at) / 1000;
  const probes = run.samples.map((s) => s.probeMs).filter((v): v is number => v !== null);
  const bad = run.samples.filter((s) => s.probeStatus !== 200).length;
  const web = run.samples.map((s) => s.webKb).filter((v): v is number => v !== null);
  const worker = run.samples.map((s) => s.workerKb).filter((v): v is number => v !== null);
  const mb = (kb: number) => Math.round(kb / 1024);
  const metrics = {
    rows: ROWS,
    cancelledAfterRows: written,
    seconds: Math.round(seconds),
    rowsPerSecond: Number((run.last.counts.total / seconds).toFixed(1)),
    idleProbeMs: { p50: percentile(idle, 50), max: Math.max(...idle) },
    importProbeMs: {
      p50: percentile(probes, 50),
      p95: percentile(probes, 95),
      max: Math.max(...probes)
    },
    probesNot200: bad,
    probes: probes.length,
    webMb: web.length ? { first: mb(web[0]), max: mb(Math.max(...web)), last: mb(web.at(-1)!) } : null,
    workerMb: worker.length ? { max: mb(Math.max(...worker)) } : null
  };
  // eslint-disable-next-line no-console
  console.log(`SMOKE ${JSON.stringify(metrics)}`);
  writeFileSync(info.outputPath('smoke50k-metrics.json'), JSON.stringify(metrics, null, 2));
  await info.attach('smoke50k-metrics', {
    body: JSON.stringify(metrics, null, 2),
    contentType: 'application/json'
  });

  // ---- the limits -------------------------------------------------------------
  expect(bad, 'the storefront answered 200 to every probe').toBe(0);
  expect(metrics.importProbeMs.p95, 'the storefront stayed responsive (p95 of the probes)').toBeLessThan(
    Math.max(3000, 5 * (metrics.idleProbeMs.max as number))
  );
  if (metrics.webMb) {
    expect(metrics.webMb.max - metrics.webMb.first, 'the web process did not grow by more than 500 MB').toBeLessThan(500);
  }
  if (metrics.workerMb) {
    expect(metrics.workerMb.max, 'the worker stayed inside its ceiling (workerMemoryMb, 1,024)').toBeLessThan(1024);
  }
  expect(VIEW_URL.test(page.url())).toBe(true);
});

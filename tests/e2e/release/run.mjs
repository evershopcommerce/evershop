#!/usr/bin/env node
// EverShop release check. See README.md in this folder.
//
//   node tests/e2e/release/run.mjs                      # pack HEAD, every scenario
//   node tests/e2e/release/run.mjs --candidate 2.3.0    # positive control
//   node tests/e2e/release/run.mjs --scenarios fresh --setup-only   # leave a store running
//   node tests/e2e/release/run.mjs --specs-only <run dir> [--grep R-CHK]   # re-run specs on it
//   node tests/e2e/release/run.mjs --specs-only <run dir> --spec 06-stripe  # only these spec files
//   node tests/e2e/release/run.mjs --restart <run dir>  # restart it (resets the login rate limit)
//   node tests/e2e/release/run.mjs --stop <run dir>     # stop it and drop its database
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { resolveCandidate } from './lib/candidate.mjs';
import {
  createDatabase,
  DB_PREFIX,
  dropDatabase,
  query,
  serverReachable
} from './lib/db.mjs';
import { run } from './lib/proc.mjs';
import { scanServerLog } from './lib/serverLog.mjs';
import { seedLegacyStore } from './lib/seedLegacy.mjs';
import { startStripeListener } from './lib/stripeListener.mjs';
import * as storeLib from './lib/store.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const E2E_ROOT = path.resolve(HERE, '..');
const REPO_ROOT = path.resolve(E2E_ROOT, '../..');

const { values: opts } = parseArgs({
  options: {
    candidate: { type: 'string', default: 'pack' },
    ref: { type: 'string', default: 'HEAD' },
    scenarios: { type: 'string', default: 'fresh,upgrade:2.3.0,upgrade:2.2.2' },
    node: { type: 'string' },
    keep: { type: 'boolean', default: false },
    'setup-only': { type: 'boolean', default: false },
    stop: { type: 'string' },
    'specs-only': { type: 'string' },
    restart: { type: 'string' },
    grep: { type: 'string' },
    spec: { type: 'string' },
    'run-dir': { type: 'string' },
    port: { type: 'string', default: '3900' },
    'pg-host': { type: 'string', default: process.env.PGHOST || 'localhost' },
    'pg-port': { type: 'string', default: process.env.PGPORT || '5432' },
    'pg-user': {
      type: 'string',
      default: process.env.PGUSER || os.userInfo().username
    },
    'pg-password': { type: 'string', default: process.env.PGPASSWORD || '' }
  }
});
const pg = {
  pgHost: opts['pg-host'],
  pgPort: opts['pg-port'],
  pgUser: opts['pg-user'],
  pgPassword: opts['pg-password']
};
const log = (msg) => console.log(`[release-check] ${msg}`);

/** Secrets for the payment specs, from the gitignored tests/e2e/.env.release. */
function readReleaseEnv() {
  const file = path.join(E2E_ROOT, '.env.release');
  if (!fs.existsSync(file)) return {};
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return env;
}

function nodeBinFor(version) {
  if (!version) return null;
  const bin = path.join(
    os.homedir(),
    `.nvm/versions/node/v${version.replace(/^v/, '')}/bin`
  );
  if (!fs.existsSync(path.join(bin, 'node'))) {
    throw new Error(
      `Node ${version} is not installed. Run: nvm install ${version}`
    );
  }
  return bin;
}

// ---------------------------------------------------------------- results
const results = [];
async function step(scenario, id, title, fn) {
  const t0 = Date.now();
  log(`${scenario} ▸ ${id} ${title}`);
  try {
    const detail = await fn();
    results.push({
      scenario,
      id,
      title,
      status: 'passed',
      detail: detail || '',
      ms: Date.now() - t0
    });
    return true;
  } catch (e) {
    results.push({
      scenario,
      id,
      title,
      status: 'failed',
      detail: String(e.message || e),
      ms: Date.now() - t0
    });
    log(`${scenario} ✗ ${id} ${String(e.message || e).split('\n')[0]}`);
    return false;
  }
}

// ---------------------------------------------------------------- stores
function makeStore(runId, runDir, scenario, nodeBin) {
  const slug = scenario.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
  const scenarioDir = path.join(runDir, slug);
  fs.mkdirSync(scenarioDir, { recursive: true });
  return {
    scenario,
    name: `release-check-${slug}`.replace(/_/g, '-'),
    scenarioDir,
    dir: path.join(scenarioDir, 'project'),
    database: `${DB_PREFIX}${runId}_${slug}`,
    logFile: path.join(scenarioDir, 'install.log'),
    serverLog: path.join(scenarioDir, 'server.log'),
    mailDir: path.join(scenarioDir, 'mail'),
    nodeBin
  };
}

function writeStoreFile(store, extra) {
  const file = path.join(store.scenarioDir, 'store.json');
  fs.writeFileSync(
    file,
    `${JSON.stringify(
      {
        scenario: store.scenario,
        baseUrl: `http://localhost:${store.port}`,
        admin: {
          email: storeLib.ADMIN.email,
          password: storeLib.ADMIN.password
        },
        mailDir: store.mailDir,
        serverLog: store.serverLog,
        database: store.database,
        pg,
        ...extra
      },
      null,
      2
    )}\n`
  );
  return file;
}

function startEnv(store, releaseEnv) {
  return {
    RELEASE_CHECK_MAIL_DIR: store.mailDir,
    // Every link-signing secret the features of this release can use.
    CART_RECOVERY_TOKEN_SECRET: 'release-check-cart-recovery-secret-0123456789',
    ORDER_TRACKING_TOKEN_SECRET:
      'release-check-order-tracking-secret-0123456789',
    // The payment accounts are for the specs only: the store gets its keys
    // through its settings, as a merchant's store does.
    ...Object.fromEntries(
      Object.entries(releaseEnv).filter(([k]) => !/^(STRIPE|PAYPAL)_/.test(k))
    )
  };
}

async function startStore(store, releaseEnv) {
  store.port = store.port || (await storeLib.freePort(Number(opts.port)));
  await storeLib.start(store, startEnv(store, releaseEnv));
  return `listening on port ${store.port}`;
}

async function freshScenario(store, candidate, releaseEnv) {
  const s = store.scenario;
  const ok =
    (await step(
      s,
      'R-INS-01',
      `Create the project and install ${candidate.label} from npm`,
      () =>
        storeLib.createProject(store, {
          installSpec: candidate.installSpec,
          repoRoot: REPO_ROOT
        })
    )) &&
    (await step(
      s,
      'R-INS-02',
      'evershop install (npm run setup) completes',
      async () => {
        await createDatabase(pg, store.database);
        await storeLib.setup(store, pg);
      }
    )) &&
    (await step(s, 'R-INS-03', 'Every core migration ran', async () => {
      const r = await storeLib.checkMigrations(store, pg);
      if (r.problems.length) throw new Error(r.problems.join('\n'));
      return `${
        Object.keys(r.expected).length
      } modules at their latest version`;
    })) &&
    (await step(s, 'R-INS-04', 'evershop build (production)', () =>
      storeLib.build(store)
    )) &&
    (await step(s, 'R-INS-05', 'evershop start answers', () =>
      startStore(store, releaseEnv)
    ));
  return ok
    ? writeStoreFile(store, { candidateVersion: candidate.version })
    : null;
}

async function upgradeScenario(store, candidate, previous, releaseEnv) {
  const s = store.scenario;
  const legacyFile = path.join(store.scenarioDir, 'legacy.json');
  let ok =
    (await step(
      s,
      'R-UPG-01',
      `Install the previous release ${previous} and start it`,
      async () => {
        await storeLib.createProject(store, {
          installSpec: `@evershop/evershop@${previous}`,
          repoRoot: REPO_ROOT
        });
        await createDatabase(pg, store.database);
        await storeLib.setup(store, pg);
        await storeLib.build(store);
        return startStore(store, releaseEnv);
      }
    )) &&
    (await step(
      s,
      'R-UPG-02',
      `Create store data with ${previous} (catalog, customers, orders)`,
      async () => {
        const legacy = await seedLegacyStore({
          baseUrl: `http://localhost:${store.port}`,
          admin: storeLib.ADMIN,
          pg,
          database: store.database,
          version: previous
        });
        fs.writeFileSync(legacyFile, `${JSON.stringify(legacy, null, 2)}\n`);
        return legacy.summary;
      }
    ));
  await storeLib.stop(store);
  ok =
    ok &&
    (await step(
      s,
      'R-UPG-03',
      `Install ${candidate.label} over it and build`,
      async () => {
        await storeLib.installOver(store, candidate.installSpec);
        await storeLib.build(store);
      }
    )) &&
    (await step(s, 'R-UPG-04', 'The upgraded store starts', () =>
      startStore(store, releaseEnv)
    )) &&
    (await step(
      s,
      'R-UPG-05',
      'Every migration ran on the upgraded database',
      async () => {
        const r = await storeLib.checkMigrations(store, pg);
        if (r.problems.length) throw new Error(r.problems.join('\n'));
        return `${
          Object.keys(r.expected).length
        } modules at their latest version`;
      }
    ));
  return ok
    ? writeStoreFile(store, {
        candidateVersion: candidate.version,
        previousVersion: previous,
        legacyFile
      })
    : null;
}

async function runSpecs(
  store,
  storeFile,
  releaseEnv,
  { projects = ['setup', 'release'], outName = 'playwright', files = [] } = {}
) {
  const outDir = path.join(store.scenarioDir, outName);
  // File filters first: `--project` takes every argument after it.
  const args = [
    'playwright',
    'test',
    ...files,
    '-c',
    'release/playwright.release.config.ts'
  ];
  for (const p of projects) args.push('--project', p);
  if (opts.grep) args.push('--grep', opts.grep, '--pass-with-no-tests');
  const env = {
    ...process.env,
    ...releaseEnv,
    RELEASE_STORE_FILE: storeFile,
    RELEASE_OUTPUT_DIR: outDir,
    RELEASE_STATE_DIR: path.join(store.scenarioDir, 'state')
  };
  log(`${store.scenario} ▸ running the specs (report: ${outDir}/html)`);
  await run('npx', args, {
    cwd: E2E_ROOT,
    env,
    echo: false,
    logFile: path.join(store.scenarioDir, 'playwright.log')
  });
  const resultsFile = path.join(outDir, 'results.json');
  if (!fs.existsSync(resultsFile)) {
    results.push({
      scenario: store.scenario,
      id: 'R-SPECS',
      title: 'Run the Playwright specs',
      status: 'failed',
      detail: 'no results.json (see playwright.log)',
      ms: 0
    });
    return;
  }
  const report = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
  const walk = (suite, file) => {
    for (const spec of suite.specs || []) {
      for (const t of spec.tests || []) {
        const last = t.results?.at(-1);
        const status =
          t.status === 'skipped'
            ? 'skipped'
            : t.status === 'expected'
            ? 'passed'
            : t.status === 'flaky'
            ? 'flaky'
            : 'failed';
        const m = spec.title.match(/^(R-[A-Z]+-\d+)\s+(.*)$/);
        results.push({
          scenario: store.scenario,
          id: m ? m[1] : path.basename(file || suite.file || ''),
          title: m ? m[2] : spec.title,
          status,
          detail:
            status === 'failed'
              ? String(last?.error?.message || '')
                  .replace(/\x1b\[[0-9;]*m/g, '')
                  .split('\n')
                  .slice(0, 40)
                  .join('\n')
              : last?.annotations?.map((a) => a.description).join('; ') || '',
          ms: last?.duration || 0
        });
      }
    }
    for (const child of suite.suites || []) walk(child, file || suite.file);
  };
  for (const suite of report.suites || []) walk(suite, suite.file);
}

/** Stop and start a store on its port (same database). Also resets the
 *  login rate limit, which lives in the store process's memory. */
async function restartStore(store, releaseEnv) {
  await storeLib.stop(store);
  if (!store.port)
    store.port = Number(
      new URL(
        JSON.parse(
          fs.readFileSync(path.join(store.scenarioDir, 'store.json'), 'utf8')
        ).baseUrl
      ).port
    );
  await storeLib.start(store, startEnv(store, releaseEnv));
}

/**
 * Every spec pass for one store: the upgrade checks (upgrade scenarios), then
 * one pass per spec file. The store is restarted before each pass, so each
 * one has the store's in-memory rate limits (8 logins per 15 minutes, 120 API
 * calls per minute, per IP) to itself.
 */
async function runAllPasses(store, storeFile, releaseEnv) {
  const s = store.scenario;
  let first = true;
  const restart = async (why) => {
    if (!first)
      await step(s, 'R-RST', `Restart the store before ${why}`, () =>
        restartStore(store, releaseEnv)
      );
    first = false;
  };
  // --spec 06-stripe,07-paypal: only the spec files whose name starts so
  // (and the upgrade checks only when `upgrade` is listed).
  const wanted = opts.spec ? opts.spec.split(',').map((x) => x.trim()) : null;
  const picked = (name) => !wanted || wanted.some((w) => name.startsWith(w));
  if (s.startsWith('upgrade:') && picked('upgrade')) {
    await restart('the upgrade checks');
    await runSpecs(store, storeFile, releaseEnv, {
      projects: ['setup', 'upgrade'],
      outName: 'playwright-upgrade'
    });
  }
  const specFiles = fs
    .readdirSync(path.join(HERE, 'specs'))
    .filter((f) => f.endsWith('.spec.ts') && picked(f))
    .sort();
  for (const file of specFiles) {
    await restart(file);
    const pass = (extraEnv = {}) =>
      runSpecs(
        store,
        storeFile,
        { ...releaseEnv, ...extraEnv },
        {
          outName: `playwright-${file.replace(/\.spec\.ts$/, '')}`,
          files: [`release/specs/${file}`]
        }
      );
    if (/stripe/.test(file)) await withStripeWebhooks(store, releaseEnv, pass);
    else await pass();
  }
}

/**
 * Run `fn` with Stripe's test events forwarded to the store (`stripe listen`).
 * The spec gets the session's signing secret as STRIPE_WEBHOOK_SECRET. No
 * Stripe keys: the pass runs anyway and its specs skip themselves.
 */
async function withStripeWebhooks(store, releaseEnv, fn) {
  if (!releaseEnv.STRIPE_SECRET_KEY) return fn();
  let listener = null;
  await step(
    store.scenario,
    'R-STR-00',
    'Forward Stripe test events to the store (stripe listen)',
    async () => {
      listener = await startStripeListener({
        apiKey: releaseEnv.STRIPE_SECRET_KEY,
        // store.json has the base URL; `store.port` is unset in a
        // --specs-only run until the first restart.
        forwardTo: `${
          JSON.parse(
            fs.readFileSync(path.join(store.scenarioDir, 'store.json'), 'utf8')
          ).baseUrl
        }/api/stripe/webhook`,
        logFile: path.join(store.scenarioDir, 'stripe-listen.log')
      });
      return 'listening';
    }
  );
  if (!listener) return fn();
  try {
    return await fn({ STRIPE_WEBHOOK_SECRET: listener.secret });
  } finally {
    await listener.stop();
  }
}

function writeReport(runDir, candidate) {
  const lines = [
    `# Release check — ${candidate.label}`,
    '',
    `Run: ${path.basename(runDir)}  ·  Node ${opts.node || process.version}`,
    ''
  ];
  const scenarios = [...new Set(results.map((r) => r.scenario))];
  for (const s of scenarios) {
    const rs = results.filter((r) => r.scenario === s);
    const count = (st) => rs.filter((r) => r.status === st).length;
    lines.push(
      `## ${s} — ${count('passed')} passed, ${count('failed')} failed, ${count(
        'skipped'
      )} skipped${count('flaky') ? `, ${count('flaky')} flaky` : ''}`,
      ''
    );
    for (const r of rs) {
      const mark = { passed: '✔', failed: '✘', skipped: '–', flaky: '!' }[
        r.status
      ];
      lines.push(
        `- ${mark} **${r.id}** ${r.title}${
          r.detail && r.status !== 'passed'
            ? `\n  \`\`\`\n  ${r.detail.split('\n').join('\n  ')}\n  \`\`\``
            : r.detail
            ? ` — ${r.detail}`
            : ''
        }`
      );
    }
    lines.push('');
  }
  const file = path.join(runDir, 'report.md');
  fs.writeFileSync(file, `${lines.join('\n')}\n`);
  return file;
}

async function stopRun(runDir) {
  const meta = JSON.parse(
    fs.readFileSync(path.join(runDir, 'run.json'), 'utf8')
  );
  for (const st of meta.stores) {
    await storeLib.stop(st);
    if (!opts.keep) await dropDatabase(pg, st.database);
    log(`stopped ${st.scenario}${opts.keep ? '' : `, dropped ${st.database}`}`);
  }
}

/**
 * Order numbers are `10000 + the newest order_id + 1`
 * (checkout/services/orderCreator.ts), so every new store starts at #10001.
 * PayPal gets the order number as `invoice_id`, and a PayPal account that
 * requires unique invoice ids (the sandbox's does) refuses a repeat with 422
 * DUPLICATE_INVOICE_ID after the buyer approved. One sandbox account serves
 * every scratch store, so each store's order ids start at a number of its
 * own: seconds since 2026-01-01 (stores are made minutes apart and make far
 * fewer orders than that). The formula reads the newest EXISTING id, so the
 * next order still gets a low number; the PayPal spec places one COD order
 * first for that reason.
 */
async function uniqueOrderNumbers(store) {
  const start = Math.floor(Date.now() / 1000) - 1_767_225_600;
  await query(
    pg,
    store.database,
    `ALTER TABLE "order" ALTER COLUMN "order_id" RESTART WITH ${start}`
  );
  log(`${store.scenario} ▸ new order ids start at ${start}`);
}

/** Re-run the specs against the stores a --setup-only run left running. */
async function specsOnly(runDir) {
  const meta = JSON.parse(
    fs.readFileSync(path.join(runDir, 'run.json'), 'utf8')
  );
  const releaseEnv = readReleaseEnv();
  for (const st of meta.stores) {
    const storeFile = path.join(st.scenarioDir, 'store.json');
    if (!fs.existsSync(storeFile)) continue;
    // Keep playwright/.auth: the admin session is reused between re-runs, so
    // re-running does not spend the store's 8 logins per 15 minutes.
    for (const dir of fs
      .readdirSync(st.scenarioDir)
      .filter((d) => d.startsWith('playwright'))) {
      fs.rmSync(path.join(st.scenarioDir, dir), {
        recursive: true,
        force: true
      });
    }
    await runAllPasses(st, storeFile, releaseEnv);
  }
  printFailures();
  process.exitCode = results.some((r) => r.status === 'failed') ? 1 : 0;
}

function printFailures() {
  for (const r of results.filter((x) => x.status === 'failed')) {
    console.log(`\n✘ ${r.scenario} ${r.id} ${r.title}\n${r.detail}`);
  }
  const count = (st) => results.filter((r) => r.status === st).length;
  log(
    `${count('passed')} passed, ${count('failed')} failed, ${count(
      'skipped'
    )} skipped`
  );
}

/** Restart the stores of a --setup-only run (same database, same port). */
async function restartRun(runDir) {
  const meta = JSON.parse(
    fs.readFileSync(path.join(runDir, 'run.json'), 'utf8')
  );
  const releaseEnv = readReleaseEnv();
  for (const st of meta.stores) {
    const storeFile = path.join(st.scenarioDir, 'store.json');
    if (!fs.existsSync(storeFile)) continue;
    await restartStore(st, releaseEnv);
    log(`restarted ${st.scenario} on port ${st.port}`);
  }
}

// ---------------------------------------------------------------- main
async function main() {
  if (opts.restart) return restartRun(path.resolve(opts.restart));
  if (opts.stop) return stopRun(path.resolve(opts.stop));
  if (opts['specs-only']) return specsOnly(path.resolve(opts['specs-only']));

  const reachable = await serverReachable(pg);
  if (reachable !== true)
    throw new Error(
      `PostgreSQL is not reachable at ${pg.pgHost}:${pg.pgPort} as ${pg.pgUser}: ${reachable}`
    );
  const nodeBin = nodeBinFor(opts.node);
  const releaseEnv = readReleaseEnv();
  const runId = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '_')
    .slice(0, 15)
    .toLowerCase();
  const runDir = path.resolve(
    opts['run-dir'] || path.join(os.tmpdir(), 'evershop-release-check', runId)
  );
  fs.mkdirSync(runDir, { recursive: true });
  log(`run folder: ${runDir}`);

  const candidate = await resolveCandidate({
    candidate: opts.candidate,
    ref: opts.ref,
    repoRoot: REPO_ROOT,
    runDir,
    log
  });
  log(`candidate: ${candidate.label} → ${candidate.installSpec}`);

  const scenarios = opts.scenarios
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  const stores = [];
  for (const scenario of scenarios) {
    const store = makeStore(runId, runDir, scenario, nodeBin);
    stores.push(store);
    fs.writeFileSync(
      path.join(runDir, 'run.json'),
      `${JSON.stringify({ candidate, stores }, null, 2)}\n`
    );
    let storeFile;
    if (scenario === 'fresh') {
      storeFile = await freshScenario(store, candidate, releaseEnv);
    } else if (scenario.startsWith('upgrade:')) {
      storeFile = await upgradeScenario(
        store,
        candidate,
        scenario.slice('upgrade:'.length),
        releaseEnv
      );
    } else {
      throw new Error(
        `Unknown scenario "${scenario}" (use fresh or upgrade:<version>)`
      );
    }
    if (storeFile) await uniqueOrderNumbers(store);
    if (opts['setup-only']) {
      log(
        `store is running: http://localhost:${store.port}  (admin ${storeLib.ADMIN.email} / ${storeLib.ADMIN.password})`
      );
      log(`store file: ${storeFile}`);
      log(`stop it with: node tests/e2e/release/run.mjs --stop ${runDir}`);
      return;
    }
    if (storeFile) {
      await runAllPasses(store, storeFile, releaseEnv);
      await step(scenario, 'R-LOG-01', 'The store log has no errors', () => {
        const found = scanServerLog(store.serverLog);
        if (found.length) throw new Error(found.slice(0, 15).join('\n'));
      });
    }
    await storeLib.stop(store);
    if (!opts.keep) {
      await dropDatabase(pg, store.database);
      fs.rmSync(store.dir, { recursive: true, force: true });
    }
  }
  const reportFile = writeReport(runDir, candidate);
  printFailures();
  const failed = results.filter((r) => r.status === 'failed');
  log(`report: ${reportFile}`);
  log(
    failed.length
      ? `${failed.length} FAILED: ${failed
          .map((r) => `${r.scenario}/${r.id}`)
          .join(', ')}`
      : 'all passed'
  );
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((e) => {
  console.error(`[release-check] ${e.stack || e}`);
  process.exitCode = 1;
});

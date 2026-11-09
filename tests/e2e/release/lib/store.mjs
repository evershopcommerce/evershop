// A scratch EverShop store, made the way a user makes one.
//
// createProject() repeats what `npx create-evershop-app` does (package.json,
// `npm install @evershop/evershop` + its dev dependencies, config/default.json,
// the sample extension and theme), except that `@evershop/evershop` is the
// release candidate. Then `npm run setup` (= `evershop install`), `npm run
// build`, `npm run start`: the same commands the installation guide gives.
//
// The only additions to a user's project: config/production.json (it repeats
// the sample extension, because node-config replaces arrays, and adds the mail
// capture extension) and the extension itself. Both are needed to see emails.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { query } from './db.mjs';
import { mustRun, run, sleep, tailOf } from './proc.mjs';

const DEV_DEPENDENCIES = [
  '@parcel/watcher',
  '@types/config',
  '@types/express',
  '@types/node',
  '@types/pg',
  '@types/react',
  'execa',
  'typescript'
];

export const ADMIN = {
  fullName: 'Release Check Admin',
  email: 'admin@release-check.test',
  password: 'ReleaseCheck2026'
};

export function storeEnv(store, extra = {}) {
  const env = { ...process.env };
  // Never leak the caller's database or port into the store's commands;
  // only what `extra` sets on purpose reaches them.
  for (const k of Object.keys(env)) {
    if (/^(DB_|PG|NODE_ENV$|PORT$|NODE_CONFIG|npm_)/.test(k)) delete env[k];
  }
  Object.assign(env, extra);
  if (store.nodeBin) env.PATH = `${store.nodeBin}:${env.PATH}`;
  return env;
}

export async function createProject(store, { installSpec, repoRoot }) {
  const { dir, logFile } = store;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    `${JSON.stringify(
      {
        name: store.name,
        version: '0.1.0',
        type: 'module',
        private: true,
        scripts: {
          setup: 'evershop install',
          start: 'evershop start',
          build: 'evershop build',
          dev: 'evershop dev'
        }
      },
      null,
      2
    )}\n`
  );
  const env = storeEnv(store);
  await mustRun(
    'npm',
    [
      'install',
      '--no-audit',
      '--save',
      '--save-exact',
      '--loglevel',
      'error',
      installSpec
    ],
    { cwd: dir, env, logFile }
  );
  await mustRun(
    'npm',
    [
      'install',
      '--no-audit',
      '--save',
      '--save-exact',
      '--loglevel',
      'error',
      ...DEV_DEPENDENCIES,
      '--save-dev'
    ],
    { cwd: dir, env, logFile }
  );

  // config/default.json exactly as create-evershop-app writes it.
  fs.mkdirSync(path.join(dir, 'config'), { recursive: true });
  const defaultConfig = {
    shop: { language: 'en', currency: 'USD' },
    system: {
      extensions: [
        { name: 'sample', resolve: 'extensions/sample', enabled: true }
      ],
      theme: 'sample'
    }
  };
  fs.writeFileSync(
    path.join(dir, 'config/default.json'),
    `${JSON.stringify(defaultConfig, null, 2)}\n`
  );
  fs.writeFileSync(
    path.join(dir, 'config/production.json'),
    `${JSON.stringify(
      {
        system: {
          extensions: [
            { name: 'sample', resolve: 'extensions/sample', enabled: true },
            {
              name: 'releaseCheckMail',
              resolve: 'extensions/release-check-mail',
              enabled: true
            }
          ],
          notification_emails: { from: 'store@release-check.test' }
        }
      },
      null,
      2
    )}\n`
  );

  const sample = path.join(repoRoot, 'packages/create-evershop-app/sample');
  fs.cpSync(path.join(sample, 'extensions'), path.join(dir, 'extensions'), {
    recursive: true
  });
  fs.cpSync(path.join(sample, 'themes'), path.join(dir, 'themes'), {
    recursive: true
  });
  // The fixture keeps bootstrap.js out of a dist/ folder (git ignores dist/);
  // a production store loads only dist/ of a local extension.
  const fixture = path.join(
    repoRoot,
    'tests/e2e/release/fixtures/release-check-mail'
  );
  const mailExt = path.join(dir, 'extensions/release-check-mail');
  fs.mkdirSync(path.join(mailExt, 'dist'), { recursive: true });
  fs.copyFileSync(
    path.join(fixture, 'package.json'),
    path.join(mailExt, 'package.json')
  );
  fs.copyFileSync(
    path.join(fixture, 'bootstrap.js'),
    path.join(mailExt, 'dist/bootstrap.js')
  );
}

/**
 * `npm run setup` (evershop install). It refuses to run when DB_HOST is set,
 * so the host is answered at its prompt; the other answers come from the
 * environment variables the command reads (DB_PORT, DB_NAME, …, ADMIN_*).
 */
export async function setup(store, pg) {
  const env = storeEnv(store, {
    DB_PORT: String(pg.pgPort),
    DB_NAME: store.database,
    DB_USER: pg.pgUser,
    // An empty password would be asked for; trust authentication ignores it.
    DB_PASSWORD: pg.pgPassword || 'release-check',
    ADMIN_FULLNAME: ADMIN.fullName,
    ADMIN_EMAIL: ADMIN.email,
    ADMIN_PASSWORD: ADMIN.password
  });
  const log = fs.openSync(store.logFile, 'a');
  fs.writeSync(log, '\n$ npm run setup\n');
  const code = await new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'setup'], {
      cwd: store.dir,
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let seen = '';
    let answered = false;
    const onData = (chunk) => {
      fs.writeSync(log, chunk);
      seen += chunk.toString();
      if (!answered && /Postgres Database Host/.test(seen)) {
        answered = true;
        child.stdin.write(pg.pgHost === 'localhost' ? '\r' : `${pg.pgHost}\r`);
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', reject);
    child.on('close', (c) => resolve(c ?? 1));
    setTimeout(() => child.kill('SIGTERM'), 180_000).unref();
  });
  fs.closeSync(log);
  const out = tailOf(store.logFile, 30);
  if (
    code !== 0 ||
    !/Installation completed/.test(out) ||
    !fs.existsSync(path.join(store.dir, '.env'))
  ) {
    throw new Error(`evershop install did not complete (exit ${code})\n${out}`);
  }
}

export async function build(store) {
  await mustRun('npm', ['run', 'build'], {
    cwd: store.dir,
    env: storeEnv(store),
    logFile: store.logFile
  });
}

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

/** The migration versions the installed package ships, per module. */
export function expectedMigrations(store) {
  const modulesDir = path.join(
    store.dir,
    'node_modules/@evershop/evershop/dist/modules'
  );
  const expected = {};
  for (const mod of fs.readdirSync(modulesDir)) {
    const migDir = path.join(modulesDir, mod, 'migration');
    if (!fs.existsSync(migDir)) continue;
    const versions = fs
      .readdirSync(migDir)
      .map((f) => f.match(/^Version-(\d+\.\d+\.\d+)\.js$/)?.[1])
      .filter(Boolean)
      .sort(compareVersions);
    if (versions.length) expected[mod] = versions.at(-1);
  }
  return expected;
}

/** Compare the `migration` table with what the package ships. A failed
 *  migration is logged and the process still exits 0, so this is the check. */
export async function checkMigrations(store, pg) {
  const expected = expectedMigrations(store);
  const rows = await query(
    pg,
    store.database,
    'SELECT module, version FROM migration'
  );
  const actual = Object.fromEntries(rows.map((r) => [r.module, r.version]));
  const problems = Object.entries(expected)
    .filter(([mod, v]) => actual[mod] !== v)
    .map(
      ([mod, v]) =>
        `${mod}: expected ${v}, database has ${actual[mod] ?? 'nothing'}`
    );
  return { expected, actual, problems };
}

export function freePort(from) {
  return new Promise((resolve) => {
    const tryPort = (p) => {
      const srv = net.createServer();
      srv.once('error', () => tryPort(p + 1));
      srv.once('listening', () => srv.close(() => resolve(p)));
      srv.listen(p, '127.0.0.1');
    };
    tryPort(from);
  });
}

/** `npm run start`, detached, so the whole process group can be stopped. */
export async function start(store, extraEnv = {}) {
  const out = fs.openSync(store.serverLog, 'a');
  const env = storeEnv(store, { PORT: String(store.port), ...extraEnv });
  const child = spawn('npm', ['run', 'start'], {
    cwd: store.dir,
    env,
    detached: true,
    stdio: ['ignore', out, out]
  });
  child.unref();
  store.pid = child.pid;
  fs.writeFileSync(
    path.join(store.dir, '.release-check.pid'),
    String(child.pid)
  );
  const url = `http://localhost:${store.port}/`;
  for (let i = 0; i < 90; i += 1) {
    if (!alive(child.pid)) break;
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status < 500) return;
    } catch {
      // not listening yet
    }
    await sleep(2000);
  }
  await stop(store);
  throw new Error(
    `The store did not answer on ${url}\n${tailOf(store.serverLog, 40)}`
  );
}

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function stop(store) {
  const pidFile = path.join(store.dir, '.release-check.pid');
  const pid =
    store.pid ??
    (fs.existsSync(pidFile) ? Number(fs.readFileSync(pidFile, 'utf8')) : null);
  if (!pid) return;
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    // already gone
  }
  for (let i = 0; i < 20 && alive(pid); i += 1) await sleep(500);
  try {
    process.kill(-pid, 'SIGKILL');
  } catch {
    // already gone
  }
  fs.rmSync(pidFile, { force: true });
  store.pid = null;
}

/** Install another version over the project (the upgrade step). */
export async function installOver(store, installSpec) {
  await mustRun(
    'npm',
    [
      'install',
      '--no-audit',
      '--save',
      '--save-exact',
      '--loglevel',
      'error',
      installSpec
    ],
    {
      cwd: store.dir,
      env: storeEnv(store),
      logFile: store.logFile
    }
  );
}

export { run };

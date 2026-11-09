/* eslint-disable no-console -- this is a CLI; its report IS console output */
// Gives the database named by DB_NAME the schema of a store: the migrations of the
// core modules, as `evershop start` runs them. The import tests (§ 11.3) and the end-to-end
// specs need it. SKIP_MODULES (comma separated) leaves modules out: the import tests
// create the tables of the import themselves, in a schema of their own.
//
//   DB_HOST=... DB_USER=... DB_PASSWORD=... DB_NAME=evershop_import_scratch_test \
//     SKIP_MODULES=import node scripts/ci/migrateCoreSchema.mjs
//
// It needs the compiled package (`npm run compile`).
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = path.join(root, 'packages/evershop/dist');
process.env.SUPPRESS_NO_CONFIG_WARNING = '1';

const { getCoreModules } = await import(`${dist}/bin/lib/loadModules.js`);
const { migrate } = await import(`${dist}/bin/lib/bootstrap/migrate.js`);
const { pool } = await import(`${dist}/lib/postgres/connection.js`);

const skip = new Set((process.env.SKIP_MODULES ?? '').split(',').filter(Boolean));
const modules = getCoreModules().filter((module) => !skip.has(module.name));
console.log(`Migrating ${process.env.DB_NAME}: ${modules.map((m) => m.name).join(', ')}`);

// `migrate` ends the process with exit code 0 when a migration fails (after logging it),
// so the check of the result is the job of whoever runs this: the workflow counts tables.
await migrate(modules);

const { rows } = await pool.query(
  `SELECT count(*)::int AS tables FROM information_schema.tables WHERE table_schema = 'public'`
);
console.log(`${rows[0].tables} tables in ${process.env.DB_NAME}`);
// `migrate` keeps one connection for itself and never gives it back, so `pool.end()` would
// wait for it for ever: leave by process.exit.
process.exit(rows[0].tables >= 50 ? 0 : 1);

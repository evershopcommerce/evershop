// Scratch databases for the release check. Every database this file creates
// or drops must carry the `evershop_rehearsal_` prefix: the guard below is the
// only thing between a typo and a real store's database.
import pg from 'pg';

export const DB_PREFIX = 'evershop_rehearsal_';

export function pgSettings(opts) {
  return {
    host: opts.pgHost,
    port: Number(opts.pgPort),
    user: opts.pgUser,
    password: opts.pgPassword || undefined
  };
}

function guard(name) {
  if (!name.startsWith(DB_PREFIX) || !/^[a-z0-9_]+$/.test(name)) {
    throw new Error(
      `Refusing to touch database "${name}": not a ${DB_PREFIX}* scratch database`
    );
  }
}

async function withAdmin(opts, fn) {
  const client = new pg.Client({ ...pgSettings(opts), database: 'postgres' });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function createDatabase(opts, name) {
  guard(name);
  await withAdmin(opts, async (c) => {
    await c.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await c.query(`CREATE DATABASE "${name}"`);
  });
}

export async function dropDatabase(opts, name) {
  guard(name);
  await withAdmin(opts, (c) =>
    c.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
  );
}

/** Run one query on a scratch database and return its rows. */
export async function query(opts, name, sql, params = []) {
  guard(name);
  const client = new pg.Client({ ...pgSettings(opts), database: name });
  await client.connect();
  try {
    const { rows } = await client.query(sql, params);
    return rows;
  } finally {
    await client.end();
  }
}

export async function serverReachable(opts) {
  try {
    await withAdmin(opts, (c) => c.query('SELECT 1'));
    return true;
  } catch (e) {
    return e.message;
  }
}

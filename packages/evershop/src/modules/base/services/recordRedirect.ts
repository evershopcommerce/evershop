import { del, insertOnUpdate, update } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

interface RedirectInput {
  fromPath: string;
  toPath: string;
  entityUrn?: string | null;
}

/**
 * Record an old->new URL redirect, collapsing chains at write time so reads are
 * always a single hop. Runs inside the caller's transaction (the entity update
 * service supplies the connection). See wiki/url-redirects.md.
 *
 * Steps, in order:
 *  1. Reclaim  — a stale redirect sitting on the now-live destination must go.
 *  2. Collapse — repoint any redirect that pointed at the vacated `fromPath`
 *                to `toPath` (so A->B then B->C becomes A->C).
 *  3. Upsert   — the new `fromPath -> toPath` hop (overwrites in place).
 */
export async function recordRedirect(
  connection: PoolClient,
  { fromPath, toPath, entityUrn = null }: RedirectInput
): Promise<void> {
  // Never self-redirect (no-op rename, or from == to).
  if (!fromPath || !toPath || fromPath === toPath) {
    return;
  }

  // 1. Reclaim the destination path.
  await del('url_redirect')
    .where('from_path', '=', toPath)
    .execute(connection);

  // 2. Collapse incoming chains onto the new target.
  await update('url_redirect')
    .given({ to_path: toPath })
    .where('to_path', '=', fromPath)
    .execute(connection);

  // 3. Upsert the new hop (keyed on from_path).
  await insertOnUpdate('url_redirect', ['from_path'])
    .given({
      from_path: fromPath,
      to_path: toPath,
      entity_urn: entityUrn,
      source: 'auto'
    })
    .execute(connection);
}

/**
 * Set-based equivalent of calling {@link recordRedirect} once per spec, in three
 * statements regardless of N. Used for the fan-out cases — a category rename/reparent
 * cascading over a whole subtree, or a variant group moving together — where the naive
 * loop is O(N) round-trips holding row locks for the length of the transaction.
 *
 * Correctness relies on the fan-out invariant that every `fromPath` (a path being
 * vacated, under the OLD prefix) is disjoint from every `toPath` (under the NEW
 * prefix) — true for any category move, since a category can't be reparented under
 * its own descendant. Under that invariant the batched reclaim→collapse→upsert is
 * equivalent to the per-row ordering. Self-redirects are dropped and inputs are
 * de-duplicated on `fromPath` (last wins, matching the upsert's ON CONFLICT).
 */
export async function recordRedirectsBatch(
  connection: PoolClient,
  redirects: RedirectInput[]
): Promise<void> {
  const byFrom = new Map<string, RedirectInput>();
  for (const r of redirects) {
    if (!r.fromPath || !r.toPath || r.fromPath === r.toPath) {
      continue;
    }
    byFrom.set(r.fromPath, r);
  }
  if (byFrom.size === 0) {
    return;
  }

  const froms: string[] = [];
  const tos: string[] = [];
  const urns: (string | null)[] = [];
  for (const r of byFrom.values()) {
    froms.push(r.fromPath);
    tos.push(r.toPath);
    urns.push(r.entityUrn ?? null);
  }

  // 1. Reclaim: drop any redirect sitting on a path that is now going live.
  await connection.query(
    'DELETE FROM url_redirect WHERE from_path = ANY($1::text[])',
    [tos]
  );

  // 2. Collapse: repoint every redirect that pointed at a vacated `fromPath`
  //    onto its new target (A->B plus B->C becomes A->C), in one statement.
  await connection.query(
    `UPDATE url_redirect AS r
        SET to_path = m.to_path
       FROM (
         SELECT unnest($1::text[]) AS from_path,
                unnest($2::text[]) AS to_path
       ) AS m
      WHERE r.to_path = m.from_path`,
    [froms, tos]
  );

  // 3. Upsert every new hop (keyed on from_path).
  await connection.query(
    `INSERT INTO url_redirect (from_path, to_path, entity_urn, source)
     SELECT unnest($1::text[]), unnest($2::text[]), unnest($3::text[]), 'auto'
     ON CONFLICT (from_path) DO UPDATE
        SET to_path = EXCLUDED.to_path,
            entity_urn = EXCLUDED.entity_urn,
            source = EXCLUDED.source`,
    [froms, tos, urns]
  );
}

/**
 * Purge every redirect OWNED by an entity — its full historical alias chain
 * (e.g. `/shoe -> /sneaker`, `/boot -> /sneaker`). Called on entity delete so
 * old aliases stop 302ing and can't 302 to a slug that a different entity later
 * re-takes. This is the per-entity GC the `entity_urn` partial index is for.
 *
 * (Keying on `from_path = <current live path>` would be a no-op: `recordRedirect`
 * already reclaims the destination when a path goes live, so no row is ever left
 * whose `from_path` is the entity's *current* path — the rows to clean are the
 * historical aliases, which only `entity_urn` identifies.)
 */
export async function clearRedirectsForEntity(
  connection: PoolClient,
  entityUrn: string
): Promise<void> {
  await del('url_redirect')
    .where('entity_urn', '=', entityUrn)
    .execute(connection);
}

/**
 * Multi-entity variant of {@link clearRedirectsForEntity}, one statement. Needed
 * when a delete cascades in the database beyond the row the service touched — a
 * category delete fires DELETE_SUB_CATEGORIES_TRIGGER, which removes every
 * descendant sub-category by DB trigger (never calling deleteCategory), so their
 * redirect aliases would otherwise be orphaned. The caller collects the subtree's
 * URNs (recursive walk) and clears them all here.
 */
export async function clearRedirectsForEntities(
  connection: PoolClient,
  entityUrns: string[]
): Promise<void> {
  if (entityUrns.length === 0) {
    return;
  }
  await connection.query(
    'DELETE FROM url_redirect WHERE entity_urn = ANY($1::varchar[])',
    [entityUrns]
  );
}

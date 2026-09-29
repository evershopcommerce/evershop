import type { Pool, PoolClient } from 'pg';
import { slugify } from '../util/slugify.js';

/**
 * References from a theme's content to data the STORE owns
 * (`theme.json` widget settings).
 *
 * A widget that shows a collection or a product has to name one, and a theme
 * cannot know the uuids of a store it has never seen. Naming them by uuid (what
 * the page builder writes) makes the manifest unportable: the uuid belongs to
 * the author's store and matches nothing anywhere else. So a manifest names
 * them by BUSINESS KEY, through a token:
 *
 *   "collection":  "store-ref:collection/code/autumn-menu"
 *   "productUuid": "store-ref:product/sku/CAKE-SIG-01"
 *
 * `theme:active` looks each one up in the store and substitutes the value that
 * widget's setting expects — the collection's `code`, the product's `uuid`.
 *
 * It never creates anything. Activation installs a theme's content, not a
 * store's catalogue (The Nguyen, 2026-09-14): a reference that matches nothing
 * resolves to an empty setting, so the widget renders its own empty state, and
 * the CLI reports it so the merchant knows which widgets to fill in.
 */

export const STORE_REF_PREFIX = 'store-ref:';

const TOKEN_RE = /store-ref:(collection|product)\/(code|sku)\/([A-Za-z0-9._\-]+)/g;

export type StoreRefEntity = 'collection' | 'product';

export interface StoreRef {
  /** The whole token, e.g. `store-ref:product/sku/CAKE-01`. */
  token: string;
  entity: StoreRefEntity;
  /** The column the key looks up: `code` for a collection, `sku` for a product. */
  by: 'code' | 'sku';
  key: string;
}

/** How a reference was satisfied. `name` means the key matched an entity's name, not its key. */
export type StoreRefMatch = 'exact' | 'name' | 'unresolved';

export interface ResolvedStoreRef extends StoreRef {
  match: StoreRefMatch;
  /** The value written into the setting: a collection `code`, a product `uuid`, or '' when unresolved. */
  value: string;
}

/**
 * What each entity contributes to a setting. A widget names a collection by its
 * code and a product by its uuid, so resolution emits exactly that — no extra
 * syntax in the token for the caller to get wrong.
 */
const EMITS: Record<StoreRefEntity, 'code' | 'uuid'> = {
  collection: 'code',
  product: 'uuid'
};

export function storeRefToken(entity: StoreRefEntity, by: 'code' | 'sku', key: string): string {
  return `${STORE_REF_PREFIX}${entity}/${by}/${key}`;
}

/** Every store reference appearing anywhere in a value tree, de-duplicated by token. */
export function collectStoreRefs(value: unknown): StoreRef[] {
  const found = new Map<string, StoreRef>();
  const walk = (node: unknown): void => {
    if (typeof node === 'string') {
      for (const m of node.matchAll(TOKEN_RE)) {
        found.set(m[0], {
          token: m[0],
          entity: m[1] as StoreRefEntity,
          by: m[2] as 'code' | 'sku',
          key: m[3]
        });
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === 'object') {
      Object.values(node as Record<string, unknown>).forEach(walk);
    }
  };
  walk(value);
  return [...found.values()];
}

/** A token pointing at an entity/key combination this version cannot resolve. */
export function isUnsupportedStoreRef(text: string): boolean {
  return (
    text.startsWith(STORE_REF_PREFIX) &&
    !new RegExp(`^${TOKEN_RE.source}$`).test(text)
  );
}

async function resolveCollection(
  conn: Pool | PoolClient,
  key: string
): Promise<{ value: string; match: StoreRefMatch }> {
  const exact = await conn.query<{ code: string }>(
    `SELECT code FROM collection WHERE code = $1 LIMIT 1`,
    [key]
  );
  if (exact.rows.length > 0) {
    return { value: exact.rows[0].code, match: 'exact' };
  }
  // The store may hold the same collection under a different code — match on
  // the name, compared the way a slug is, so "Autumn menu" answers `autumn-menu`.
  const byName = await conn.query<{ code: string; name: string }>(
    `SELECT code, name FROM collection`
  );
  const hit = byName.rows.find((r) => slugify(r.name) === slugify(key));
  return hit ? { value: hit.code, match: 'name' } : { value: '', match: 'unresolved' };
}

async function resolveProduct(
  conn: Pool | PoolClient,
  key: string
): Promise<{ value: string; match: StoreRefMatch }> {
  const exact = await conn.query<{ uuid: string }>(
    `SELECT uuid::text AS uuid FROM product WHERE sku = $1 LIMIT 1`,
    [key]
  );
  if (exact.rows.length > 0) {
    return { value: exact.rows[0].uuid, match: 'exact' };
  }
  const byName = await conn.query<{ uuid: string; name: string }>(
    `SELECT p.uuid::text AS uuid, d.name
       FROM product p
       INNER JOIN product_description d
               ON d.product_description_product_id = p.product_id
      WHERE p.status = TRUE`
  );
  const hit = byName.rows.find((r) => slugify(r.name) === slugify(key));
  return hit ? { value: hit.uuid, match: 'name' } : { value: '', match: 'unresolved' };
}

/** Look every reference up in the store. Read-only: nothing is created. */
export async function resolveStoreRefs(
  conn: Pool | PoolClient,
  refs: StoreRef[]
): Promise<ResolvedStoreRef[]> {
  const out: ResolvedStoreRef[] = [];
  for (const ref of refs) {
    try {
      const r =
        ref.entity === 'collection'
          ? await resolveCollection(conn, ref.key)
          : await resolveProduct(conn, ref.key);
      out.push({ ...ref, ...r });
    } catch {
      // An unmigrated or unreachable table must not fail an install; the
      // reference simply stays unresolved and is reported.
      out.push({ ...ref, value: '', match: 'unresolved' });
    }
  }
  return out;
}

/**
 * Replace every token with its resolved value, deeply, returning a new value.
 * An unresolved reference becomes an EMPTY setting rather than a dead key: the
 * widget then renders the same empty state it shows before a merchant has
 * picked anything, instead of querying for something that does not exist.
 */
export function applyStoreRefs<T>(value: T, resolved: ResolvedStoreRef[]): T {
  if (resolved.length === 0) {
    return value;
  }
  const byToken = new Map(resolved.map((r) => [r.token, r.value]));
  const replace = (s: string): string =>
    s.replace(TOKEN_RE, (whole) => byToken.get(whole) ?? '');
  const walk = (node: unknown): unknown => {
    if (typeof node === 'string') {
      return replace(node);
    }
    if (Array.isArray(node)) {
      return node.map(walk);
    }
    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        out[k] = walk(v);
      }
      return out;
    }
    return node;
  };
  return walk(value) as T;
}

export { EMITS as STORE_REF_EMITS };

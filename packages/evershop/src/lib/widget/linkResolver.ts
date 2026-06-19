import { Pool } from 'pg';
import { select } from '../postgres/query.js';
import { buildUrl } from '../router/buildUrl.js';
import { UrnService } from '../urn/index.js';
import { addProcessor, getValueSync } from '../util/registry.js';

/**
 * Widget link URN + resolver.
 *
 * Background: widgets stored link URLs as plain strings, baked at edit
 * time. When the underlying entity's URL key changed (rename a category,
 * change a page's slug, etc.) every widget linking to it broke. URNs
 * keep stable references in storage and let us resolve to the current
 * URL at request time, with per-request batching so a page with N
 * internal links does at most one query per kind.
 *
 * Format: standard EverShop URN — `urn:evershop:<service>:<type>:<id>`,
 * built and parsed via `UrnService`. id is uuid for product/category/page,
 * code for collection. Plain URLs (custom or pre-URN saved settings) pass
 * through unchanged.
 *
 * Extensibility: third-party modules register loaders for their types via
 * `registerLinkLoader('blog', 'post', factory)` in their bootstrap, after
 * also calling `registerUrnSchema()` for the same (service, type) pair.
 */

/** Loader contract: given a batch of ids of one kind, return URLs (or null) in the same order. */
export type LinkBatchFn = (
  ids: readonly string[],
  pool: Pool
) => Promise<(string | null)[]>;

export type LinkLoader = {
  load: (id: string) => Promise<string | null>;
};

export type LinkLoaderFactory = (pool: Pool) => LinkLoader;

/** Loaders keyed by `${service}:${type}` to match the URN registry's composite key. */
export type LinkLoaders = Record<string, LinkLoader>;

function loaderKey(service: string, type: string): string {
  return `${service}:${type}`;
}

/**
 * Tiny request-scoped batcher. Coalesces .load() calls in the same
 * microtask into one batchFn call; caches results within the request.
 */
function createLoader(pool: Pool, batchFn: LinkBatchFn): LinkLoader {
  let queue: Array<{ id: string; resolve: (v: string | null) => void }> = [];
  const cache = new Map<string, Promise<string | null>>();
  let scheduled = false;
  const flush = async () => {
    scheduled = false;
    const batch = queue;
    queue = [];
    const ids = batch.map((b) => b.id);
    try {
      const values = await batchFn(ids, pool);
      batch.forEach(({ resolve }, i) => resolve(values[i] ?? null));
    } catch {
      // A loader failure should never break the page — return null for
      // all in-flight ids so widgets render with a missing link instead
      // of a 500.
      batch.forEach(({ resolve }) => resolve(null));
    }
  };
  return {
    load(id: string) {
      const hit = cache.get(id);
      if (hit) return hit;
      const p = new Promise<string | null>((resolve) => {
        queue.push({ id, resolve });
      });
      cache.set(id, p);
      if (!scheduled) {
        scheduled = true;
        queueMicrotask(flush);
      }
      return p;
    }
  };
}

/**
 * Build a loader factory from a batch function. Convenience wrapper so
 * extensions don't need to think about queueing.
 *
 *   registerLinkLoader('blog', 'post', linkLoaderFromBatch(async (uuids, pool) => {
 *     const rows = await select('uuid', 'slug').from('blog_post')
 *       .where('uuid', 'IN', [...uuids]).execute(pool);
 *     const m = new Map(rows.map(r => [r.uuid, `/blog/${r.slug}`]));
 *     return uuids.map(u => m.get(u) ?? null);
 *   }));
 */
export function linkLoaderFromBatch(batchFn: LinkBatchFn): LinkLoaderFactory {
  return (pool) => createLoader(pool, batchFn);
}

/** Built-in catalog:product loader. */
const productLoader: LinkLoaderFactory = linkLoaderFromBatch(
  async (uuids, pool) => {
    if (uuids.length === 0) return [];
    const rows = await select('entity_uuid', 'request_path')
      .from('url_rewrite')
      .where('entity_type', '=', 'product')
      .and('entity_uuid', 'IN', [...uuids])
      .execute(pool);
    const m = new Map<string, string>(
      rows.map((r: any) => [r.entity_uuid, r.request_path])
    );
    return uuids.map(
      (u) => m.get(u) ?? buildUrl('productView', { uuid: u })
    );
  }
);

/** Built-in catalog:category loader. */
const categoryLoader: LinkLoaderFactory = linkLoaderFromBatch(
  async (uuids, pool) => {
    if (uuids.length === 0) return [];
    const rows = await select('entity_uuid', 'request_path')
      .from('url_rewrite')
      .where('entity_type', '=', 'category')
      .and('entity_uuid', 'IN', [...uuids])
      .execute(pool);
    const m = new Map<string, string>(
      rows.map((r: any) => [r.entity_uuid, r.request_path])
    );
    return uuids.map(
      (u) => m.get(u) ?? buildUrl('categoryView', { uuid: u })
    );
  }
);

/** Built-in cms:page loader. */
const pageLoader: LinkLoaderFactory = linkLoaderFromBatch(
  async (uuids, pool) => {
    if (uuids.length === 0) return [];
    const rows = await select('uuid', 'url_key')
      .from('cms_page')
      .where('uuid', 'IN', [...uuids])
      .execute(pool);
    const m = new Map<string, string>(
      rows.map((r: any) => [
        r.uuid,
        buildUrl('cmsPageView', { url_key: r.url_key })
      ])
    );
    return uuids.map((u) => m.get(u) ?? null);
  }
);

// Note: collections are non-navigable groupings in EverShop — they have no
// public-facing page, so there's no built-in collection loader. Linking
// "to a collection" doesn't make sense; widgets that *display* a collection
// (CollectionSpotlight, CollectionStack) reference it by `code` in their
// settings instead.

const BUILTIN: Record<string, LinkLoaderFactory> = {
  [loaderKey('catalog', 'product')]: productLoader,
  [loaderKey('catalog', 'category')]: categoryLoader,
  [loaderKey('cms', 'page')]: pageLoader
};

/**
 * Register a custom link loader. Must be called from a module's
 * bootstrap (the value registry is locked once bootstrap completes).
 * The same (service, type) must also be registered with the URN
 * schema registry — otherwise URNs of that type fail to parse.
 */
export function registerLinkLoader(
  service: string,
  type: string,
  factory: LinkLoaderFactory
): void {
  addProcessor<Record<string, LinkLoaderFactory>>(
    'linkLoaderFactories',
    (map) => ({ ...map, [loaderKey(service, type)]: factory })
  );
}

/** Build per-request loaders. Called by the GraphQL middleware once per request. */
export function createLinkLoaders(pool: Pool): LinkLoaders {
  const factories = getValueSync<Record<string, LinkLoaderFactory>>(
    'linkLoaderFactories',
    BUILTIN,
    {}
  );
  const out: LinkLoaders = {};
  for (const [key, factory] of Object.entries(factories)) {
    out[key] = factory(pool);
  }
  return out;
}

/**
 * Resolve a stored link value to a current URL. Plain URLs pass through
 * unchanged; URNs go through their loader. Returns null when an internal
 * entity can't be found (so widgets can suppress the link).
 */
export async function resolveLink(
  value: string | null | undefined,
  loaders: LinkLoaders | undefined
): Promise<string | null> {
  if (!value) return null;
  if (!UrnService.isValid(value)) return value; // plain URL passthrough
  const { service, type, uuid } = UrnService.parse(value);
  const loader = loaders?.[loaderKey(service, type)];
  if (!loader) return null;
  return loader.load(uuid);
}

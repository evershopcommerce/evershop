import { listMetafieldDefinitions } from './definition.js';
import type { MetafieldDefinition } from './types.js';

/**
 * Request-scoped memo for metafield definition lookups.
 *
 * Every GraphQL `metafields`/`metafield` resolution loads the owner's
 * definitions; a 48-card grid would fire 48 identical SELECTs per request.
 * The cache is created per request at both GraphQL context build sites (the
 * `linkLoaders` idiom) and passed into `shapeMetafields` — one query per
 * owner type per request.
 *
 * Values are PROMISES, not results: concurrent card resolvers all miss an
 * empty cache simultaneously, so the first caller stores its in-flight query
 * and the other 47 await the same promise instead of racing their own.
 *
 * Deliberately request-scoped (not process/TTL): definitions are
 * runtime-mutable via the admin, so any longer-lived cache would need an
 * invalidation story; per-request is always fresh and needs none.
 */
export type DefinitionCache = Map<string, Promise<MetafieldDefinition[]>>;

export function createDefinitionCache(): DefinitionCache {
  return new Map();
}

/** Shared context shape for the six entity metafield resolvers. */
export interface MetafieldResolverContext {
  user?: unknown;
  metafieldDefinitionCache?: DefinitionCache;
}

export function listDefinitionsCached(
  ownerType: string,
  cache?: DefinitionCache
): Promise<MetafieldDefinition[]> {
  if (!cache) return listMetafieldDefinitions(ownerType);
  let promise = cache.get(ownerType);
  if (!promise) {
    promise = listMetafieldDefinitions(ownerType);
    cache.set(ownerType, promise);
  }
  return promise;
}

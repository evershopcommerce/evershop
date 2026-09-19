import { listDefinitionsCached } from './definitionCache.js';
import type { DefinitionCache } from './definitionCache.js';
import type { MetaData, ShapedMetafield } from './types.js';

/**
 * Zip a stored `meta_data` object with its owner type's definitions for output,
 * gated by audience. A `customer` audience drops `visible_to_customer = false`
 * definitions. There is no "return everything" overload — the audience is
 * required so a caller cannot accidentally leak hidden fields.
 *
 * `cache` (optional) is the request-scoped definition memo the GraphQL
 * context carries — without it every resolved field costs a definitions
 * SELECT, which multiplies per card on grid pages. Non-GraphQL callers can
 * omit it; behavior is unchanged.
 */
export async function shapeMetafields(
  metaData: MetaData,
  ownerType: string,
  opts: {
    audience: 'admin' | 'customer';
    namespace?: string;
    cache?: DefinitionCache;
  }
): Promise<ShapedMetafield[]> {
  const definitions = await listDefinitionsCached(ownerType, opts.cache);
  const data = metaData ?? {};
  const out: ShapedMetafield[] = [];

  for (const def of definitions) {
    if (opts.audience === 'customer' && !def.visibleToCustomer) continue;
    if (opts.namespace && def.namespace !== opts.namespace) continue;
    out.push({
      namespace: def.namespace,
      key: def.key,
      type: def.type,
      value: data?.[def.namespace]?.[def.key] ?? null
    });
  }

  return out;
}

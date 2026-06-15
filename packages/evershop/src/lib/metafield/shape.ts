import { listMetafieldDefinitions } from './definition.js';
import type { MetaData, ShapedMetafield } from './types.js';

/**
 * Zip a stored `meta_data` object with its owner type's definitions for output,
 * gated by audience. A `customer` audience drops `visible_to_customer = false`
 * definitions. There is no "return everything" overload — the audience is
 * required so a caller cannot accidentally leak hidden fields.
 */
export async function shapeMetafields(
  metaData: MetaData,
  ownerType: string,
  opts: { audience: 'admin' | 'customer'; namespace?: string }
): Promise<ShapedMetafield[]> {
  const definitions = await listMetafieldDefinitions(ownerType);
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

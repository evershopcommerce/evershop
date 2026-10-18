import type { Pool } from 'pg';
import type { Lookup, StoredCategory } from '../services/ports/lookup.js';
import type { ImportEntity } from '../services/types.js';

/**
 * What decides a reserved `url_key` and does not live in the database: the
 * routes of the storefront (they are scanned from `route.json` files into the
 * router's memory) and the enabled languages (a setting with a merge rule of its
 * own). The composition root gives core's `getRoutes()` and
 * `getEnabledLanguages()`, so the rule stays in core and is not copied here.
 */
export interface ReservedKeySources {
  /** The paths of the routes that are not admin and not API, e.g. `/cart`. */
  routePaths(): readonly string[];
  /** The enabled locale codes, e.g. `en`. */
  enabledLanguages(): Promise<readonly string[]>;
}

/**
 * The same test as `base/services/assertUrlKeyAvailable.ts`: a route of one
 * segment of letters, digits and hyphens. A `url_key` equal to one is
 * unreachable, because the route matcher wins over the `url_rewrite` fallback.
 */
const SINGLE_SEGMENT = /^\/[a-zA-Z0-9-]+$/;

/** The `owner_type` of the custom-field definitions of each entity. */
const OWNER_TYPE: Record<ImportEntity, string | null> = {
  category: 'category',
  product: 'product',
  customer: 'customer',
  // Addresses carry no custom fields.
  customerAddress: null
};

/**
 * The questions of the stages about the store (§ 4.5, point 2), read-only and in
 * batches. It takes the pool as an argument, so a test can point it at a scratch
 * database.
 */
export class PgLookup implements Lookup {
  constructor(
    private readonly pool: Pool,
    private readonly reserved: ReservedKeySources
  ) {}

  async categories(
    urlKeys: readonly string[]
  ): Promise<Map<string, StoredCategory>> {
    const found = new Map<string, StoredCategory>();
    if (urlKeys.length === 0) {
      return found;
    }
    const result = await this.pool.query(
      `SELECT c.category_id, c.uuid, c.status, cd.url_key, cd.name,
              parent.url_key AS parent_url_key
         FROM category_description cd
         JOIN category c ON c.category_id = cd.category_description_category_id
         LEFT JOIN category_description parent
                ON parent.category_description_category_id = c.parent_id
        WHERE cd.url_key = ANY($1::text[])`,
      [urlKeys]
    );
    for (const row of result.rows) {
      found.set(row.url_key, {
        id: row.category_id,
        uuid: row.uuid,
        urlKey: row.url_key,
        parentUrlKey: row.parent_url_key,
        name: row.name,
        status: row.status ? 1 : 0
      });
    }
    return found;
  }

  async reservedUrlKeys(): Promise<ReadonlySet<string>> {
    const keys = new Set<string>();
    for (const path of this.reserved.routePaths()) {
      if (SINGLE_SEGMENT.test(path)) {
        keys.add(path.slice(1));
      }
    }
    for (const language of await this.reserved.enabledLanguages()) {
      keys.add(language);
    }
    return keys;
  }

  async metafieldKeys(entity: ImportEntity): Promise<ReadonlySet<string>> {
    const owner = OWNER_TYPE[entity];
    if (owner === null) {
      return new Set();
    }
    const result = await this.pool.query(
      `SELECT namespace, field_key FROM metafield_definition WHERE owner_type = $1`,
      [owner]
    );
    return new Set(
      result.rows.map((row) => `${row.namespace}.${row.field_key}`)
    );
  }
}

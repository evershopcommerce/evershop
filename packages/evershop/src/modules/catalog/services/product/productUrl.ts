import type { Pool, PoolClient } from 'pg';
import { pool as defaultPool } from '../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { getBaseUrl } from '../../../../lib/util/getBaseUrl.js';

export interface ProductUrlOptions {
  /** Prefix the store's base URL (`getBaseUrl()`), for emails and feeds */
  absolute?: boolean;
}

const UUID_FORMAT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres returns a uuid in lowercase, whatever case it was sent in */
const toKey = (uuid: string) => String(uuid).toLowerCase();

/**
 * The storefront URLs of products, in the order of `uuids`, with one query
 * for the whole list: the friendly path from `url_rewrite` (e.g.
 * `/men/basic-tee`, with the category path when the product is in a
 * category), else the product page route (`/product/<uuid>`), for a product
 * whose rewrite does not exist yet.
 *
 * The list goes to Postgres as one array parameter (`= ANY($2)`), so its
 * length has no limit, and the query runs with `connection.query()`, so a
 * client the caller passes is never released. A value that is not a uuid is
 * not sent to the database; it gets the route URL like a product without a
 * rewrite.
 *
 * Not localized. In a storefront request, wrap the path with `localizeUrl`
 * where the caller always did (`Product.url` does). Building the route URL
 * needs the routes loaded: the web app, the event and the cron processes load
 * them at start.
 */
export async function getProductUrls(
  uuids: string[],
  options: ProductUrlOptions = {},
  connection: Pool | PoolClient = defaultPool
): Promise<string[]> {
  const wanted = [
    ...new Set(uuids.filter((uuid) => UUID_FORMAT.test(uuid)).map(toKey))
  ];
  const paths = new Map<string, string>();
  if (wanted.length > 0) {
    const { rows } = await connection.query<{
      entity_uuid: string;
      request_path: string;
    }>({
      text: 'SELECT entity_uuid, request_path FROM url_rewrite WHERE entity_type = $1 AND entity_uuid = ANY($2::uuid[])',
      values: ['product', wanted]
    });
    rows.forEach((row) => paths.set(row.entity_uuid, row.request_path));
  }
  const base = options.absolute ? getBaseUrl() : '';
  return uuids.map(
    (uuid) =>
      `${base}${paths.get(toKey(uuid)) ?? buildUrl('productView', { uuid })}`
  );
}

/**
 * The storefront URL of one product (see `getProductUrls`). Takes the uuid
 * or anything with a `uuid`, such as a product row.
 */
export async function getProductUrl(
  product: string | { uuid: string },
  options: ProductUrlOptions = {},
  connection: Pool | PoolClient = defaultPool
): Promise<string> {
  const uuid = typeof product === 'string' ? product : product.uuid;
  const [url] = await getProductUrls([uuid], options, connection);
  return url;
}

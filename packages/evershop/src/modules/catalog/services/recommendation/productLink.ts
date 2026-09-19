import { pool as appPool } from '../../../../lib/postgres/connection.js';
import {
  CONFLICT,
  INVALID_PAYLOAD,
  NOT_FOUND
} from '../../../../lib/util/httpStatus.js';
import {
  PoolLike,
  resolveRepresentativeKey
} from './applyRecommendationGating.js';

/**
 * Manual product-link CRUD behind the § 11 API routes. Links are directional
 * (A→B does not imply B→A) and typed; 'upsell' exists in the DB CHECK for
 * door-open reasons (spec § 3) but is NOT accepted here — the upsell shelf
 * is DERIVED (related rules + price-above, specifications/06 D-W1-8 as
 * amended) and takes no manual links.
 *
 * The same-representative rejection is defense-in-depth (§ 11): the DB CHECK
 * only catches literal self-links, group membership can change AFTER insert,
 * and render-time exclusion (§ 6.3) plus the hiddenReason: 'anchor_group'
 * admin flag (§ 8.2) hold the invariant regardless.
 */

export class ProductLinkError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const API_LINK_TYPES = ['related', 'cross_sell'] as const;
export type ApiLinkType = (typeof API_LINK_TYPES)[number];

export interface ProductLinkRow {
  product_link_id: number;
  uuid: string;
  product_id: number;
  linked_product_id: number;
  type: string;
  sort_order: number;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Malformed uuids must be client errors: an unguarded `WHERE uuid = $1` on a
 * UUID column raises Postgres 22P02 for a non-uuid string, which the route
 * handlers can only map to a 500.
 */
function assertUuid(value: string, label: string): void {
  if (!UUID_RE.test(value)) {
    throw new ProductLinkError(INVALID_PAYLOAD, `${label} must be a valid uuid`);
  }
}

/** sort_order lands in an INT column — out-of-range must be a 400, not PG 22003. */
function normalizeSortOrder(value: number | undefined): number {
  if (value === undefined) {
    return 0;
  }
  if (!Number.isInteger(value) || Math.abs(value) > 2147483647) {
    throw new ProductLinkError(
      INVALID_PAYLOAD,
      'sort_order must be a 32-bit integer'
    );
  }
  return value;
}

async function loadProductByUuid(
  pool: PoolLike,
  uuid: string,
  label: string
): Promise<{ product_id: number; variant_group_id: number | null }> {
  assertUuid(uuid, label);
  const result = await pool.query(
    'SELECT product_id, variant_group_id FROM product WHERE uuid = $1',
    [uuid]
  );
  if (!result.rows[0]) {
    throw new ProductLinkError(INVALID_PAYLOAD, `${label} does not exist`);
  }
  return result.rows[0];
}

export async function createProductLink(
  input: {
    productUuid: string;
    linkedProductUuid: string;
    type: ApiLinkType;
    sortOrder?: number;
  },
  pool: PoolLike = appPool as unknown as PoolLike
): Promise<ProductLinkRow> {
  if (!API_LINK_TYPES.includes(input.type)) {
    throw new ProductLinkError(
      INVALID_PAYLOAD,
      `Link type must be one of: ${API_LINK_TYPES.join(', ')}`
    );
  }
  const product = await loadProductByUuid(pool, input.productUuid, 'Product');
  const linked = await loadProductByUuid(
    pool,
    input.linkedProductUuid,
    'Linked product'
  );
  if (product.product_id === linked.product_id) {
    throw new ProductLinkError(
      INVALID_PAYLOAD,
      'A product cannot be linked to itself'
    );
  }
  const [productRep, linkedRep] = await Promise.all([
    resolveRepresentativeKey(pool, product.product_id, product.variant_group_id),
    resolveRepresentativeKey(pool, linked.product_id, linked.variant_group_id)
  ]);
  if (productRep === linkedRep) {
    throw new ProductLinkError(
      INVALID_PAYLOAD,
      'The linked product is a variant of the same group as the anchor — it can never render (the shelf excludes the anchor’s own variant group)'
    );
  }
  try {
    const result = await pool.query(
      `INSERT INTO product_link (product_id, linked_product_id, type, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING product_link_id, uuid, product_id, linked_product_id, type, sort_order`,
      [
        product.product_id,
        linked.product_id,
        input.type,
        normalizeSortOrder(input.sortOrder)
      ]
    );
    return result.rows[0];
  } catch (e) {
    if ((e as { code?: string }).code === '23505') {
      throw new ProductLinkError(
        CONFLICT,
        'This product is already linked with the same type'
      );
    }
    throw e;
  }
}

export async function updateProductLink(
  input: { productUuid: string; linkUuid: string; sortOrder: number },
  pool: PoolLike = appPool as unknown as PoolLike
): Promise<ProductLinkRow> {
  assertUuid(input.linkUuid, 'Link uuid');
  const sortOrder = normalizeSortOrder(input.sortOrder);
  const product = await loadProductByUuid(pool, input.productUuid, 'Product');
  const result = await pool.query(
    `UPDATE product_link SET sort_order = $1
     WHERE uuid = $2 AND product_id = $3
     RETURNING product_link_id, uuid, product_id, linked_product_id, type, sort_order`,
    [sortOrder, input.linkUuid, product.product_id]
  );
  if (!result.rows[0]) {
    throw new ProductLinkError(NOT_FOUND, 'Link does not exist');
  }
  return result.rows[0];
}

export async function removeProductLink(
  input: { productUuid: string; linkUuid: string },
  pool: PoolLike = appPool as unknown as PoolLike
): Promise<ProductLinkRow> {
  assertUuid(input.linkUuid, 'Link uuid');
  const product = await loadProductByUuid(pool, input.productUuid, 'Product');
  const result = await pool.query(
    `DELETE FROM product_link
     WHERE uuid = $1 AND product_id = $2
     RETURNING product_link_id, uuid, product_id, linked_product_id, type, sort_order`,
    [input.linkUuid, product.product_id]
  );
  if (!result.rows[0]) {
    throw new ProductLinkError(NOT_FOUND, 'Link does not exist');
  }
  return result.rows[0];
}

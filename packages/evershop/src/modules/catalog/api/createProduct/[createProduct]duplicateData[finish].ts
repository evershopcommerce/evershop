import { insertOnUpdate, select } from '@evershop/postgres-query-builder';
import { emit } from '../../../../lib/event/emitter.js';
import { warning } from '../../../../lib/log/logger.js';
import { getDelegate } from '../../../../lib/middleware/delegate.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';

/**
 * Post-create enrichment for duplication (`duplicate_of` in the payload, sent
 * by the productNew duplicate banner): copy the source's collection
 * memberships — the one piece of core product data that is not form data — and
 * emit `product_duplicated` so extensions can copy their own product-linked
 * records. The field itself is never persisted: no such column exists, so the
 * insert projection drops it.
 */
export default async (request: EvershopRequest, response: EvershopResponse) => {
  const sourceUuid = request.body?.duplicate_of;
  if (!sourceUuid || typeof sourceUuid !== 'string') {
    return;
  }
  try {
    const product = getDelegate<Record<string, any>>('createProduct', request);
    if (!product?.product_id) {
      return;
    }
    const source = await select()
      .from('product')
      .where('uuid', '=', sourceUuid)
      .load(pool);
    if (!source) {
      warning(
        `Duplicate source product "${sourceUuid}" no longer exists — skipping collection copy.`
      );
      return;
    }
    const collections = await select('collection_id')
      .from('product_collection')
      .where('product_id', '=', source.product_id)
      .execute(pool);
    for (const row of collections) {
      await insertOnUpdate('product_collection', [
        'collection_id',
        'product_id'
      ])
        .given({
          collection_id: row.collection_id,
          product_id: product.product_id
        })
        .execute(pool);
    }
    await emit('product_duplicated', {
      source_product_id: source.product_id,
      source_product_uuid: source.uuid,
      product_id: product.product_id,
      product_uuid: product.uuid
    });
  } catch (e) {
    // The product itself is already committed — enrichment failure must not
    // fail the create. Collections can be re-assigned manually.
    warning(`Product duplication post-create copy failed: ${e.message}`);
  }
};

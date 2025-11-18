import {
  startTransaction,
  commit,
  rollback,
  select,
  del
} from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { hookable } from '../../../../lib/util/hookable.js';
import { ProductData } from './createProduct.js';

async function deleteProductData(uuid: string, connection: PoolClient) {
  await del('product').where('uuid', '=', uuid).execute(connection);
}

/**
 * Delete product service. This service will delete a product with all related data
 * @param {String} uuid
 * @param {Object} context
 */
async function deleteProduct(uuid: string, context: Record<string, any>) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const query = select().from('product');
    query
      .leftJoin('product_description')
      .on(
        'product_description.product_description_product_id',
        '=',
        'product.product_id'
      );

    const product = await query.where('uuid', '=', uuid).load(connection);
    if (!product) {
      throw new Error('Invalid product id');
    }
    await hookable(deleteProductData, { ...context, connection, product })(
      uuid,
      connection
    );
    await commit(connection);
    return product;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Delete product service. This service will delete a product with all related data
 * @param {String} uuid
 * @param {Object} context
 */
export default async (
  uuid: string,
  context: Record<string, any>
): Promise<ProductData> => {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const hookContext = {
      connection
    };
    // Make sure the context is either not provided or is an object
    if (context && typeof context !== 'object') {
      throw new Error('Context must be an object');
    }
    // Merge hook context with context
    Object.assign(hookContext, context);
    const product = await hookable(deleteProduct, hookContext)(
      uuid,
      connection
    );
    await commit(connection);
    return product;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
};

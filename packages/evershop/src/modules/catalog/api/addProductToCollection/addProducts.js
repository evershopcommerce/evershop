const { error } = require('@evershop/evershop/src/lib/log/logger');
const {
  getConnection
} = require('@evershop/evershop/src/lib/postgres/connection');
const {
  INVALID_PAYLOAD,
  OK,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');
const {
  startTransaction,
  rollback,
  commit,
  select,
  insertOnUpdate
} = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  const { collection_id } = request.params;
  const { product_id } = request.body;
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    // Check if the collection is exists
    const collection = await select()
      .from('collection')
      .where('uuid', '=', collection_id)
      .load(connection);
    if (!collection) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'Collection does not exists'
      });
    }

    // Check if the product is exists
    const product = await select()
      .from('product')
      .where('uuid', '=', product_id)
      .load(connection);
    if (!product) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'Product does not exists'
      });
    }

    // If the product is belong to a variant group, get all the variants and assign them to the collection
    if (product.variant_group_id) {
      const variants = await select()
        .from('product')
        .where('variant_group_id', '=', product.variant_group_id)
        .execute(connection);
      // Insert all the variants to the collection
      await Promise.all(
        variants.map(async (variant) => {
          await insertOnUpdate('product_collection', [
            'collection_id',
            'product_id'
          ])
            .given({
              collection_id: collection.collection_id,
              product_id: variant.product_id
            })
            .execute(connection);
        })
      );
    } else {
      // Assign the product to the collection
      await insertOnUpdate('product_collection', [
        'collection_id',
        'product_id'
      ])
        .given({
          collection_id: collection.collection_id,
          product_id: product.product_id
        })
        .execute(connection);
    }

    await commit(connection);
    response.status(OK);
    return response.json({
      success: true,
      data: {
        product_id: product.product_id,
        collection_id: collection.collection_id
      }
    });
  } catch (e) {
    await rollback(connection);
    error(e);
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: e.message
    });
  }
};

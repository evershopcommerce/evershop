const { error } = require('@evershop/evershop/src/lib/log/debuger');
const {
  getConnection
} = require('@evershop/evershop/src/lib/postgres/connection');
const {
  INVALID_PAYLOAD,
  OK,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');
const {
  insert,
  startTransaction,
  rollback,
  commit,
  select
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
    // Check if the product is already assigned to the collection
    const productCollection = await select()
      .from('product_collection')
      .where('collection_id', '=', collection.collection_id)
      .and('product_id', '=', product.product_id)
      .load(connection);
    if (productCollection) {
      response.status(OK);
      return response.json({
        success: true,
        message: 'Product is assigned to the collection'
      });
    }

    // Assign the product to the collection
    await insert('product_collection')
      .given({
        collection_id: collection.collection_id,
        product_id: product.product_id
      })
      .execute(connection);
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

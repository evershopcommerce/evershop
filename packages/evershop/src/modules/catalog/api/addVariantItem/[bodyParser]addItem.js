const {
  select,
  update,
  startTransaction,
  commit,
  rollback
} = require('@evershop/postgres-query-builder');
const uniqid = require('uniqid');
const {
  pool,
  getConnection
} = require('@evershop/evershop/src/lib/postgres/connection');
const {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  const { id: groupId } = request.params;
  // eslint-disable-next-line camelcase
  const { product_id } = request.body;
  const connection = await getConnection(pool);
  try {
    await startTransaction(connection);
    const group = await select()
      .from('variant_group')
      .where('uuid', '=', groupId)
      .load(connection, false);

    if (!group) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid variant group'
        }
      });
      return;
    }

    const product = await select()
      .from('product')
      .where('uuid', '=', product_id)
      .and('group_id', '=', group.attribute_group_id)
      .load(connection, false);

    if (!product) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message:
            'The product is either not exist or using different attribute group'
        }
      });
      return;
    }

    await update('product')
      .given({
        variant_group_id: group.variant_group_id
      })
      .where('uuid', '=', product_id)
      .execute(connection, false);

    const variantAttributeIds = Object.values({
      attributeOne: group.attribute_one,
      attributeTwo: group.attribute_two,
      attributeThree: group.attribute_three,
      attributeFour: group.attribute_four,
      attributeFive: group.attribute_five
    }).filter((a) => a !== null);

    // Get product attribute values
    const query = select().from('product_attribute_value_index');
    query
      .innerJoin('attribute')
      .on(
        'attribute.attribute_id',
        '=',
        'product_attribute_value_index.attribute_id'
      );
    query
      .where(
        'product_attribute_value_index.product_id',
        '=',
        product.product_id
      )
      .and(
        'product_attribute_value_index.attribute_id',
        'in',
        variantAttributeIds
      );

    const attributes = await query.execute(connection, false);
    await commit(connection);
    response.status(OK);
    response.json({
      data: {
        id: uniqid(),
        attributes: attributes.map((a) => ({
          attribute_id: a.attribute_id,
          attribute_code: a.attribute_code,
          option_id: a.option_id
        })),
        product
      }
    });
  } catch (e) {
    await rollback(connection);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};

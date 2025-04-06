import { hookable } from '@evershop/evershop/src/lib/util/hookable.js';
import {
  startTransaction,
  commit,
  rollback,
  select,
  del
} from '@evershop/postgres-query-builder';
import { getConnection } from '@evershop/evershop/src/lib/postgres/connection.js';

async function deleteAttributeData(uuid, connection) {
  await del('attribute').where('uuid', '=', uuid).execute(connection);
}
/**
 * Delete attribute service. This service will delete an attribute with all related data
 * @param {String} uuid
 * @param {Object} context
 */
async function deleteAttribute(uuid, context) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const attribute = await select()
      .from('attribute')
      .where('uuid', '=', uuid)
      .load(connection);

    if (!attribute) {
      throw new Error('Invalid attribute id');
    }

    // Make sure the attribute is not being used in any variant group
    const variantGroup = await select()
      .from('variant_group')
      .where('attribute_one', '=', attribute.attribute_id)
      .or('attribute_two', '=', attribute.attribute_id)
      .or('attribute_three', '=', attribute.attribute_id)
      .or('attribute_four', '=', attribute.attribute_id)
      .or('attribute_five', '=', attribute.attribute_id)
      .load(connection);
    if (variantGroup) {
      throw new Error(
        `The attribute "${attribute.attribute_name}" is being used in a variant group`
      );
    }
    await hookable(deleteAttributeData, { ...context, connection, attribute })(
      uuid,
      connection
    );
    await commit(connection);
    return attribute;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

export default async (uuid, context) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const attribute = await hookable(deleteAttribute, context)(uuid, context);
  return attribute;
};

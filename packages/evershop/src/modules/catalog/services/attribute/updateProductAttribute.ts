import type { PoolClient } from '@evershop/postgres-query-builder';
import {
  startTransaction,
  commit,
  rollback,
  update,
  select,
  insertOnUpdate,
  del,
  insert
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { hookable } from '../../../../lib/util/hookable.js';
import { getValueSync, getValue } from '../../../../lib/util/registry.js';
import { getAjv } from '../../../base/services/getAjv.js';
import attributeDataSchema from './attributeDataSchema.json' with { type: 'json' };

export type AttributeData = {
  attribute_code?: string;
  type?: string;
  groups: number[];
  options: { option_text: string, option_id: string | number }[];
  [key: string]: any;
};

function validateAttributeDataBeforeInsert(data: AttributeData) {
  const ajv = getAjv();
  attributeDataSchema.required = [];
  const jsonSchema = getValueSync(
    'updateAttributeDataJsonSchema',
    attributeDataSchema,
    {}
  );
  const validate = ajv.compile(jsonSchema);
  const valid = validate(data);
  if (valid) {
    return data;
  } else {
    throw new Error(validate.errors[0].message);
  }
}

async function updateAttributeOptions(
  attributeId: number,
  attributeType: string,
  attributeCode: string,
  options: { option_text: string, option_id: string | number }[],
  connection: PoolClient
) {
  // Ignore updating options if it is not present in the data or if the attribute type is not select or multiselect
  if (
    options.length === 0 ||
    !['select', 'multiselect'].includes(attributeType)
  ) {
    return;
  }

  const ids = options
    .filter((o) => o !== undefined)
    .map((o) => (typeof o.option_id === 'string' ? parseInt(o.option_id, 10) : o.option_id));
  const oldOptions = await select()
    .from('attribute_option')
    .where('attribute_id', '=', attributeId)
    .execute(connection, false);

  await Promise.all(
    oldOptions.map(async (oldOption) => {
      if (!ids.includes(parseInt(oldOption.attribute_option_id, 10))) {
        await del('attribute_option')
          .where('attribute_option_id', '=', oldOption.attribute_option_id)
          .execute(connection, false);
      }
    })
  );
  /* Adding new options */
  // Looping options array and insert/update options. Use Promise.all to make sure all options are inserted/updated
  await Promise.all(
    options.map(async (option) => {
      const exists = await select()
        .from('attribute_option')
        .where('attribute_option_id', '=', option.option_id)
        .load(connection, false);

      if (exists) {
        await update('attribute_option')
          .given({
            option_text: option.option_text,
            attribute_id: attributeId,
            attribute_code: attributeCode
          })
          .where('attribute_option_id', '=', option.option_id)
          .execute(connection, false);
      } else {
        await insert('attribute_option')
          .given({
            option_text: option.option_text,
            attribute_id: attributeId,
            attribute_code: attributeCode
          })
          .execute(connection, false);
      }
    })
  );
}

async function updateAttributeGroups(attributeId: number, groups: number[], connection: PoolClient) {
  // Ignore updating groups if it is not present in the data
  if (groups.length === 0) {
    return;
  }

  // Get the current groups
  const currentGroups = await select()
    .from('attribute_group_link')
    .where('attribute_id', '=', attributeId)
    .execute(connection);

  const shouldDelete: number[] = [];
  currentGroups.forEach((g) => {
    if (
      !groups.find((group) => parseInt(group.toString(), 10) === parseInt(g.group_id.toString(), 10))
    ) {
      shouldDelete.push(g.group_id);
    }
  });

  for (let index = 0; index < groups.length; index += 1) {
    const group = await select()
      .from('attribute_group')
      .where('attribute_group_id', '=', groups[index])
      .load(connection, false);
    if (group) {
      await insertOnUpdate('attribute_group_link', ['attribute_id', 'group_id'])
        .given({ attribute_id: attributeId, group_id: groups[index] })
        .execute(connection);
    }
  }

  await del('attribute_group_link')
    .where('group_id', 'IN', shouldDelete)
    .and('attribute_id', '=', attributeId)
    .execute(connection);
}

async function updateAttributeData(uuid: string, data: AttributeData, connection: PoolClient) {
  const attribute = await select()
    .from('attribute')
    .where('uuid', '=', uuid)
    .load(connection);

  if (!attribute) {
    throw new Error('Requested attribute not found');
  }
  try {
    const attribute = await update('attribute')
      .given(data)
      .where('uuid', '=', uuid)
      .execute(connection);
    return attribute;
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    } else {
      return attribute;
    }
  }
}

/**
 * Update attribute service. This service will update a attribute with all related data
 * @param {String} uuid
 * @param {Object} data
 * @param {Object} context
 */
async function updateAttribute(uuid: string, data: AttributeData, context: Record<string, any>) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const attributeData = await getValue('attributeDataBeforeUpdate', data);
    // Delete the attribute_code and type from the data object, we do not allow to update these fields
    delete attributeData.attribute_code;
    delete attributeData.type;

    // Validate attribute data
    validateAttributeDataBeforeInsert(attributeData);

    // Insert attribute data
    const attribute = await hookable(updateAttributeData, {
      ...context,
      connection
    })(uuid, attributeData, connection);

    // Save attribute groups
    await hookable(updateAttributeGroups, {
      ...context,
      connection,
      attribute
    })(attribute.attribute_id, attributeData.groups || [], connection);

    // Save attribute options
    await hookable(updateAttributeOptions, {
      ...context,
      connection,
      attribute
    })(
      attribute.attribute_id,
      attribute.type,
      attribute.attribute_code,
      attributeData.options || [],
      connection
    );

    await commit(connection);
    return attribute;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Update attribute service. This service will update a attribute with all related data
 * @param {String} uuid
 * @param {Object} data
 * @param {Object} context
 */
export default async (uuid: string, data: AttributeData, context: Record<string, any>) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const attribute = await hookable(updateAttribute, context)(
    uuid,
    data,
    context
  );
  return attribute;
};

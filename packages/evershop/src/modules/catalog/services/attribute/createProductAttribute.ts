import {
  commit,
  insert,
  insertOnUpdate,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { hookable } from '../../../../lib/util/hookable.js';
import {
  getValue,
  getValueSync
} from '../../../../lib/util/registry.js';
import { getAjv } from '../../../base/services/getAjv.js';
import attributeDataSchema from './attributeDataSchema.json' with { type: 'json' };

export type AttributeData = {
  attribute_code: string;
  attribute_name: string;
  type: string;
  is_required: boolean;
  display_on_frontend?: boolean;
  groups: number[];
  [key: string]: any;
};

function validateAttributeDataBeforeInsert(data: AttributeData) {
  const ajv = getAjv();
  attributeDataSchema.required = [
    'attribute_code',
    'attribute_name',
    'type',
    'is_required',
    'display_on_frontend',
    'groups'
  ];
  const jsonSchema = getValueSync(
    'createAttributeDataJsonSchema',
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

async function insertAttributeGroups(attributeId: number, groups: number[], connection: PoolClient) {
  // Ignore updating groups if it is not present in the data
  if (groups.length === 0) {
    return;
  }

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
}

async function insertAttributeOptions(
  attributeId: number,
  attributeType: string,
  attributeCode: string,
  options: { option_text: string }[],
  connection: PoolClient
) {
  // Ignore updating options if it is not present in the data
  if (
    options.length === 0 ||
    !['select', 'multiselect'].includes(attributeType)
  ) {
    return;
  }

  /* Adding new options */
  await Promise.all(
    options.map(async (option) => {
      await insert('attribute_option')
        .given({
          option_text: option.option_text,
          attribute_id: attributeId,
          attribute_code: attributeCode
        })
        .execute(connection);
    })
  );
}

async function insertAttributeData(data: AttributeData, connection: PoolClient) {
  const result = await insert('attribute').given(data).execute(connection);
  return result;
}

/**
 * Create attribute service. This service will create a attribute with all related data
 * @param {Object} data
 * @param {Object} context
 */
async function createAttribute(data: AttributeData, context: Record<string, any>) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const attributeData = await getValue('attributeDataBeforeCreate', data);
    // Validate attribute data
    validateAttributeDataBeforeInsert(attributeData);

    // Insert attribute data
    const attribute = await hookable(insertAttributeData, {
      ...context,
      connection
    })(attributeData, connection);

    // Save attribute groups
    await hookable(insertAttributeGroups, {
      ...context,
      attribute,
      connection
    })(attribute.insertId, attributeData.groups || [], connection);

    // Save attribute options
    await hookable(insertAttributeOptions, {
      ...context,
      attribute,
      connection
    })(
      attribute.insertId,
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
 * Create attribute service. This service will create a attribute with all related data
 * @param {Object} data
 * @param {Object} context
 */
export default async (data: AttributeData, context: Record<string, any>) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const attribute = await hookable(createAttribute, context)(data, context);
  return attribute;
};

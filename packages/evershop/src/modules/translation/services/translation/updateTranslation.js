const { hookable } = require('@evershop/evershop/src/lib/util/hookable');
const {
  getValueSync,
  getValue
} = require('@evershop/evershop/src/lib/util/registry');
const {
  startTransaction,
  commit,
  rollback,
  update,
  select
} = require('@evershop/postgres-query-builder');
const {
  getConnection
} = require('@evershop/evershop/src/lib/postgres/connection');
const { getAjv } = require('../../../base/services/getAjv');
const translationDataSchema = require('./translationDataSchema.json');

function validateTranslationDataBeforeInsert(data) {
  const ajv = getAjv();
  translationDataSchema.required = [];
  const jsonSchema = getValueSync(
    'translationDataJsonSchema',
    translationDataSchema
  );
  const validate = ajv.compile(jsonSchema);
  const valid = validate(data);
  if (valid) {
    return data;
  } else {
    throw new Error(validate.errors[0].message);
  }
}

async function updateTranslationData(uuid, data, connection) {
  const translation = await select()
    .from('translation')
    .where('uuid', '=', uuid)
    .load(connection);

  if (!translation) {
    throw new Error('Requested translation not found');
  }

  try {
    const updatedTranslation = await update('translation')
      .given(data)
      .where('uuid', '=', uuid)
      .execute(connection);

    return updatedTranslation;
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    } else {
      return translation;
    }
  }
}

async function updateTranslation(uuid, data, context) {
  const connection = await getConnection();
  await startTransaction(connection);
  const hookContext = { connection, ...context };
  try {
    const translationData = await getValue('translationDataBeforeUpdate', data);
    // Validate translation data
    validateTranslationDataBeforeInsert(translationData);

    // Insert translation data
    const translation = await hookable(updateTranslationData, hookContext)(
      uuid,
      translationData,
      connection
    );
    await commit(connection);
    return translation;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

module.exports = async (uuid, data, context) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  // Merge hook context with context
  const translation = await hookable(updateTranslation, context)(
    uuid,
    data,
    context
  );
  return translation;
};

const { hookable } = require('@evershop/evershop/src/lib/util/hookable');
const {
  getValueSync,
  getValue
} = require('@evershop/evershop/src/lib/util/registry');
const {
  startTransaction,
  commit,
  rollback,
  insert
} = require('@evershop/postgres-query-builder');
const {
  getConnection
} = require('@evershop/evershop/src/lib/postgres/connection');
const { getAjv } = require('../../../base/services/getAjv');
const translationDataSchema = require('./translationDataSchema.json');

function validateTranslationDataBeforeInsert(data) {
  const ajv = getAjv();
  translationDataSchema.required = ['code'];
  const jsonSchema = getValueSync(
    'createTranslationDataJsonSchema',
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

async function insertTranslationData(data, connection) {
  const translation = await insert('translation')
    .given(data)
    .execute(connection);
  return translation;
}

async function createTranslation(data, context) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const translationData = await getValue(
      'translationDataBeforeCreate',
      data,
      context
    );
    validateTranslationDataBeforeInsert(translationData);

    const translation = await hookable(insertTranslationData, {
      ...context,
      connection
    })(translationData, connection);

    await commit(connection);
    return translation;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

module.exports = async (data, context) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const translation = await hookable(createTranslation, context)(data, context);
  return translation;
};

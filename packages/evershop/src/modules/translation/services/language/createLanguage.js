const { hookable } = require('@evershop/evershop/src/lib/util/hookable');
const {
  getValueSync,
  getValue
} = require('@evershop/evershop/src/lib/util/registry');
const {
  startTransaction,
  commit,
  rollback,
  insert,
  select
} = require('@evershop/postgres-query-builder');
const {
  getConnection,
  pool
} = require('@evershop/evershop/src/lib/postgres/connection');
const { getAjv } = require('../../../base/services/getAjv');
const languageDataSchema = require('./languageDataSchema.json');

function validateLanguageDataBeforeInsert(data) {
  const ajv = getAjv();
  languageDataSchema.required = ['code'];
  const jsonSchema = getValueSync(
    'createLanguageDataJsonSchema',
    languageDataSchema
  );
  const validate = ajv.compile(jsonSchema);
  const valid = validate(data);
  if (valid) {
    return data;
  } else {
    throw new Error(validate.errors[0].message);
  }
}

async function insertLanguageData(data, connection) {
  const language = await insert('language').given(data).execute(connection);
  delete language.password;
  return language;
}

async function createLanguage(data, context) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const languageData = await getValue(
      'languageDataBeforeCreate',
      data,
      context
    );
    validateLanguageDataBeforeInsert(languageData);
    const { code, isDefault } = languageData;
    const existingLanguage = await select()
      .from('language')
      .where('code', '=', code)
      .load(pool);

    if (existingLanguage) {
      throw new Error('Email is already used');
    }

    languageData.isDefault = isDefault === 1 || isDefault === 0 ? isDefault : 0;

    const language = await hookable(insertLanguageData, {
      ...context,
      connection
    })(languageData, connection);

    await commit(connection);
    return language;
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
  const language = await hookable(createLanguage, context)(data, context);
  return language;
};

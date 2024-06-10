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
const languageDataSchema = require('./languageDataSchema.json');

function validateLanguageDataBeforeInsert(data) {
  const ajv = getAjv();
  languageDataSchema.required = [];
  const jsonSchema = getValueSync('languageDataJsonSchema', languageDataSchema);
  const validate = ajv.compile(jsonSchema);
  const valid = validate(data);
  if (valid) {
    return data;
  } else {
    throw new Error(validate.errors[0].message);
  }
}

async function updateLanguageData(uuid, data, connection) {
  const language = await select()
    .from('language')
    .where('uuid', '=', uuid)
    .load(connection);

  if (!language) {
    throw new Error('Requested language not found');
  }

  try {
    const updatedLanguage = await update('language')
      .given(data)
      .where('uuid', '=', uuid)
      .execute(connection);

    return updatedLanguage;
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    } else {
      return language;
    }
  }
}

async function updateLanguage(uuid, data, context) {
  const connection = await getConnection();
  await startTransaction(connection);
  const hookContext = { connection, ...context };
  try {
    const languageData = await getValue('languageDataBeforeUpdate', data);
    // Validate language data
    validateLanguageDataBeforeInsert(languageData);

    // Insert language data
    const language = await hookable(updateLanguageData, hookContext)(
      uuid,
      languageData,
      connection
    );
    await commit(connection);
    return language;
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
  const language = await hookable(updateLanguage, context)(uuid, data, context);
  return language;
};

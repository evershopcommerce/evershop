const { getAjv } = require('../../modules/base/services/getAjv');
const { getValueSync } = require('./registry');

module.exports.validateConfiguration = function validateConfiguration(config) {
  const ajv = getAjv();
  const configSchema = getValueSync(
    'configuratonSchema',
    { type: 'object' },
    null,
    (schema) => {
      ajv.validateSchema(schema);
      if (ajv.errors) {
        throw new Error(
          `Your configuration schema is not valid: ${ajv.errors[0].instancePath}`
        );
      } else {
        return true;
      }
    }
  );

  // Validate by using Ajv
  const validate = ajv.compile(configSchema);
  const reservedKeys = [
    'get',
    'has',
    'util',
    'getConfigSources',
    'makeHidden',
    'makeImmutable',
    'setModuleDefaults',
    'watch',
    '_attachProtoDeep',
    '_cloneDeep',
    '_diffDeep',
    '_equalsDeep',
    '_extendDeep',
    '_get',
    '_getCmdLineArg',
    '_initParam',
    '_isObject',
    '_loadFileConfigs',
    '_parseFile',
    '_stripComments',
    '_stripYamlComments'
  ];
  const configuration = Object.keys(config).reduce((acc, key) => {
    if (configSchema.properties[key] || !reservedKeys.includes(key)) {
      acc[key] = config[key];
    }
    return acc;
  }, {});
  const valid = validate(configuration);
  if (!valid) {
    throw new Error(errorFormatter(validate.errors));
  } else {
    return true;
  }
};

function errorFormatter(errors) {
  const messages = ['Invalid configuration:'];
  errors.forEach((error) => {
    if (error.keyword === 'errorMessage') {
      messages.push(`${error.message}. ${error.instancePath}`);
    } else if (error.keyword === 'additionalProperties') {
      messages.push(
        `${error.instancePath}/${error.params.additionalProperty} is not allowed.`
      );
    } else if (error.keyword === 'enum') {
      messages.push(
        `${
          error.instancePath
        } must be one of the following values: ${error.params.allowedValues.join(
          ', '
        )}`
      );
    } else {
      messages.push(`${error.instancePath} ${error.message}`);
    }
  });
  return messages.join('\n');
}

const Ajv = require('ajv');
const ajvErrors = require('ajv-errors');
const addFormats = require('ajv-formats');

module.exports.getAjv = () => {
  // Initialize the ajv instance
  const ajv = new Ajv({
    strict: false,
    useDefaults: 'empty',
    allErrors: true
  });

  // Add the formats
  addFormats(ajv);
  ajv.addFormat('digit', /^[0-9]*$/);
  ajvErrors(ajv);

  return ajv;
};

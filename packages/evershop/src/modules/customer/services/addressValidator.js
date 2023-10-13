const Ajv = require('ajv');
const ajvErrors = require('ajv-errors');
const addFormats = require('ajv-formats');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');

// Initialize the ajv instance
const ajv = new Ajv({
  strict: false,
  useDefaults: 'empty',
  allErrors: true
});

// Add the formats
addFormats(ajv);
ajvErrors(ajv);

/**
 * This function validates the address using the schema defined in the configuration {customer: {addressSchema: { ... }}}
 */
module.exports.validateAddress = function validateAddress(address) {
  const addressSchema = getConfig('customer.addressSchema', undefined);
  if (!addressSchema) {
    return true;
  }

  // Compile the schema
  const validate = ajv.compile(addressSchema);
  const valid = validate(address);
  if (!valid) {
    throw new Error(validate.errors[0].message);
  } else {
    return true;
  }
};

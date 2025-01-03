const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { getAjv } = require('../../../../base/services/getAjv');

/**
 * This function validates the address using the schema defined in the json configuration {customer: {addressSchema: { ... }}}
 */
module.exports.validateAddress = function validateAddress(address) {
  const jsonSchema = getConfig('customer.addressSchema', undefined);
  if (!jsonSchema) {
    return true;
  }
  // Compile the schema
  const ajv = getAjv();
  const validate = ajv.compile(jsonSchema);
  const valid = validate(address);
  if (!valid) {
    throw new Error(validate.errors[0].message);
  } else {
    return true;
  }
};

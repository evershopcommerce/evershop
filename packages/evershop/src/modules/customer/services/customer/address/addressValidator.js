import { getConfig } from '../../../../../lib/util/getConfig.js';
import { getAjv } from '../../../../base/services/getAjv.js';

/**
 * This function validates the address using the schema defined in the json configuration {customer: {addressSchema: { ... }}}
 */
export const validateAddress = (address) => {
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

import { getConfig } from '../../../../../lib/util/getConfig.js';
import { getAjv } from '../../../../base/services/getAjv.js';

export type Address = {
  uuid?: string;
  customer_id?: number;
  full_name?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  province?: string;
  country?: string;
  postcode?: string;
  telephone?: string | number;
  is_default?: number | string;
};
/**
 * This function validates the address using the schema defined in the json configuration {customer: {addressSchema: { ... }}}
 */
export const validateAddress = <T extends Address>(address: T) => {
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

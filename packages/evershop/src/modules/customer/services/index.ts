import {
  validateAddress,
  addAddressValidationRule
} from './customer/address/addressValidators.js';
import createCustomerAddress from './customer/address/createCustomerAddress.js';
import deleteCustomerAddress from './customer/address/deleteCustomerAddress.js';
import updateCustomerAddress from './customer/address/updateCustomerAddress.js';
import createCustomer from './customer/createCustomer.js';
import deleteCustomer from './customer/deleteCustomer.js';
import updateCustomer from './customer/updateCustomer.js';
import updatePassword from './customer/updatePassword.js';
import { getCustomersBaseQuery } from './getCustomersBaseQuery.js';

export {
  getCustomersBaseQuery,
  createCustomer,
  createCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  updateCustomer,
  deleteCustomer,
  updatePassword,
  validateAddress,
  addAddressValidationRule
};

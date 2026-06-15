// createCustomer: default + CustomerData type + 4 hooks
export { default as createCustomer } from './customer/createCustomer.js';
export * from './customer/createCustomer.js';

// updateCustomer: default + 4 hooks
export { default as updateCustomer } from './customer/updateCustomer.js';
export * from './customer/updateCustomer.js';

// deleteCustomer: default + 4 hooks
export { default as deleteCustomer } from './customer/deleteCustomer.js';
export * from './customer/deleteCustomer.js';

// customer metafields
export * from './customer/customerMetafield.js';

// updatePassword: default + 4 hooks
export { default as updatePassword } from './customer/updatePassword.js';
export * from './customer/updatePassword.js';

// createCustomerAddress: default + 4 hooks
export { default as createCustomerAddress } from './customer/address/createCustomerAddress.js';
export * from './customer/address/createCustomerAddress.js';

// updateCustomerAddress: default + 4 hooks
export { default as updateCustomerAddress } from './customer/address/updateCustomerAddress.js';
export * from './customer/address/updateCustomerAddress.js';

// deleteCustomerAddress: default + 4 hooks
export { default as deleteCustomerAddress } from './customer/address/deleteCustomerAddress.js';
export * from './customer/address/deleteCustomerAddress.js';

// address validators
export * from './customer/address/addressValidators.js';

// utilities
export * from './getCustomersBaseQuery.js';
export * from './sendResetPasswordEmail.js';

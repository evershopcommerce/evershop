const { request } = require('express');
const config = require('config');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { select } = require('@evershop/postgres-query-builder');
const { comparePassword } = require('../../lib/util/passwordHelper');
const { translate } = require('../../lib/locale/translate/translate');
const { addProcessor } = require('../../lib/util/registry');
const registerDefaultCustomerCollectionFilters = require('./services/registerDefaultCustomerCollectionFilters');
const {
  defaultPaginationFilters
} = require('../../lib/util/defaultPaginationFilters');
const registerDefaultCustomerGroupCollectionFilters = require('./services/registerDefaultCustomerGroupCollectionFilters');

module.exports = () => {
  addProcessor('cartFields', (fields) => {
    fields.push({
      key: 'customer_id',
      resolvers: [
        async function resolver() {
          const triggeredField = this.getTriggeredField();
          const requestedValue = this.getRequestedValue();
          return triggeredField === 'customer_id'
            ? requestedValue
            : this.getData('customer_id');
        }
      ]
    });
    fields.push({
      key: 'customer_group_id',
      resolvers: [
        async function resolver() {
          const triggeredField = this.getTriggeredField();
          const requestedValue = this.getRequestedValue();
          return triggeredField === 'customer_group_id'
            ? requestedValue
            : this.getData('customer_group_id');
        }
      ]
    });
    fields.push({
      key: 'customer_email',
      resolvers: [
        async function resolver() {
          const triggeredField = this.getTriggeredField();
          const requestedValue = this.getRequestedValue();
          return triggeredField === 'customer_email'
            ? requestedValue
            : this.getData('customer_email');
        }
      ]
    });
    fields.push({
      key: 'customer_full_name',
      resolvers: [
        async function resolver() {
          const triggeredField = this.getTriggeredField();
          const requestedValue = this.getRequestedValue();
          return triggeredField === 'customer_full_name'
            ? requestedValue
            : this.getData('customer_full_name');
        }
      ]
    });
    return fields;
  });

  /**
   * This function will login the customer with email and password
   * @param {*} email
   * @param {*} password
   * @param {*} callback
   */
  request.loginCustomerWithEmail = async function loginCustomerWithEmail(
    email,
    password,
    callback
  ) {
    // Escape the email to prevent SQL injection
    const customerEmail = email.replace(/%/g, '\\%');
    const customer = await select()
      .from('customer')
      .where('email', 'ILIKE', customerEmail)
      .and('status', '=', 1)
      .load(pool);

    const result = comparePassword(password, customer ? customer.password : '');
    if (!customer || !result) {
      throw new Error(translate('Invalid email or password'));
    }
    this.session.customerID = customer.customer_id;
    // Delete the password field
    delete customer.password;
    // Save the customer in the request
    this.locals.customer = customer;
    this.session.save(callback);
  };

  request.logoutCustomer = function logoutCustomer(callback) {
    this.session.customerID = undefined;
    this.locals.customer = undefined;

    this.session.save(callback);
  };

  request.isCustomerLoggedIn = function isCustomerLoggedIn() {
    return !!this.session?.customerID;
  };

  request.getCurrentCustomer = function getCurrentCustomer() {
    return this.locals?.customer;
  };

  // Customer configuration
  const customerConfig = {
    addressSchema: {
      type: 'object',
      properties: {
        full_name: {
          type: 'string'
        },
        telephone: {
          type: ['string', 'number']
        },
        address_1: {
          type: 'string'
        },
        address_2: {
          type: 'string'
        },
        city: {
          type: 'string'
        },
        province: {
          type: 'string'
        },
        country: {
          type: 'string',
          pattern: '^[A-Z]{2}$'
        },
        postcode: {
          type: ['string', 'number']
        }
      },
      required: [
        'full_name',
        'telephone',
        'address_1',
        'city',
        'country',
        'postcode'
      ],
      errorMessage: {
        properties: {
          full_name: translate('Full name is required'),
          telephone: translate('Telephone is missing or invalid'),
          country: translate('Country is missing or invalid')
        }
      },
      additionalProperties: true
    }
  };
  config.util.setModuleDefaults('customer', customerConfig);

  // Reigtering the default filters for customer collection
  addProcessor(
    'customerCollectionFilters',
    registerDefaultCustomerCollectionFilters,
    1
  );
  addProcessor(
    'customerCollectionFilters',
    (filters) => [...filters, ...defaultPaginationFilters],
    2
  );

  // Reigtering the default filters for customer group collection
  addProcessor(
    'customerGroupCollectionFilters',
    registerDefaultCustomerGroupCollectionFilters,
    1
  );
  addProcessor(
    'customerGroupCollectionFilters',
    (filters) => [...filters, ...defaultPaginationFilters],
    2
  );
};

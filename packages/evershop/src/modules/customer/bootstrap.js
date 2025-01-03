const { request } = require('express');
const config = require('config');
const { merge } = require('@evershop/evershop/src/lib/util/merge');
const { translate } = require('../../lib/locale/translate/translate');
const { addProcessor } = require('../../lib/util/registry');
const registerDefaultCustomerCollectionFilters = require('./services/registerDefaultCustomerCollectionFilters');
const {
  defaultPaginationFilters
} = require('../../lib/util/defaultPaginationFilters');
const registerDefaultCustomerGroupCollectionFilters = require('./services/registerDefaultCustomerGroupCollectionFilters');
const { hookable } = require('../../lib/util/hookable');
const loginCustomerWithEmail = require('./services/customer/loginCustomerWithEmail');
const logoutCustomer = require('./services/customer/logoutCustomer');

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
  request.loginCustomerWithEmail = async function login(
    email,
    password,
    callback
  ) {
    await hookable(loginCustomerWithEmail.bind(this))(email, password);
    this.session.save(callback);
  };

  request.logoutCustomer = function logout(callback) {
    hookable(logoutCustomer.bind(this))();
    this.session.save(callback);
  };

  request.isCustomerLoggedIn = function isCustomerLoggedIn() {
    return !!this.session?.customerID;
  };

  request.getCurrentCustomer = function getCurrentCustomer() {
    return this.locals?.customer;
  };

  addProcessor('configuratonSchema', (schema) => {
    merge(schema, {
      properties: {
        customer: {
          type: 'object',
          properties: {
            addressSchema: {
              type: 'object',
              additionalProperties: true
            }
          }
        }
      }
    });
    return schema;
  });

  // Default customer configuration
  const defaultCustomerConfig = {
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
        },
        is_default: {
          type: 'integer',
          enum: [0, 1, '0', '1']
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
  config.util.setModuleDefaults('customer', defaultCustomerConfig);

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

import config from 'config';
import { request } from 'express';
import type { EvershopRequest } from 'src/types/request.js';
import { translate } from '../../lib/locale/translate/translate.js';
import { defaultPaginationFilters } from '../../lib/util/defaultPaginationFilters.js';
import { hookable } from '../../lib/util/hookable.js';
import { merge } from '../../lib/util/merge.js';
import { addProcessor } from '../../lib/util/registry.js';
import loginCustomerWithEmail from '../../modules/customer/services/customer/loginCustomerWithEmail.js';
import logoutCustomer from '../../modules/customer/services/customer/logoutCustomer.js';
import { registerDefaultCustomerCollectionFilters } from '../../modules/customer/services/registerDefaultCustomerCollectionFilters.js';
import { registerDefaultCustomerGroupCollectionFilters } from '../../modules/customer/services/registerDefaultCustomerGroupCollectionFilters.js';

export default () => {
  addProcessor('cartFields', (fields: any[]) => {
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
  (request as EvershopRequest).loginCustomerWithEmail = async function login(
    email,
    password,
    callback
  ) {
    await hookable(loginCustomerWithEmail.bind(this))(email, password);
    this.session.save(callback);
  };

  (request as EvershopRequest).logoutCustomer = function logout(callback) {
    hookable(logoutCustomer.bind(this))();
    this.session.save(callback);
  };

  (request as EvershopRequest).isCustomerLoggedIn =
    function isCustomerLoggedIn() {
      return !!this.session?.customerID;
    };

  (request as EvershopRequest).getCurrentCustomer =
    function getCurrentCustomer() {
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
    (filters: any[]) => [...filters, ...defaultPaginationFilters],
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
    (filters: any[]) => [...filters, ...defaultPaginationFilters],
    2
  );
};

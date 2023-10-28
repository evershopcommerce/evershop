const { request } = require('express');
const config = require('config');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { select } = require('@evershop/postgres-query-builder');
const { Cart } = require('../checkout/services/cart/Cart');
const { comparePassword } = require('../../lib/util/passwordHelper');
const { translate } = require('../../lib/locale/translate/translate');

module.exports = () => {
  Cart.addField('customer_id', function resolver() {
    return this.dataSource?.customer_id ?? null;
  });

  Cart.addField('customer_group_id', function resolver() {
    return this.dataSource?.customer_group_id ?? null;
  });

  Cart.addField('customer_email', function resolver() {
    return this.dataSource?.customer_email ?? null;
  });

  Cart.addField('customer_full_name', function resolver() {
    return this.dataSource?.customer_full_name ?? null;
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
};

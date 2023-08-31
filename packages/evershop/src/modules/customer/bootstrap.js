const { request } = require('express');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { select } = require('@evershop/postgres-query-builder');
const { compareSync } = require('bcryptjs');
const { Cart } = require('../checkout/services/cart/Cart');

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
    const customer = await select()
      .from('customer')
      .where('email', '=', email)
      .and('status', '=', 1)
      .load(pool);

    const result = compareSync(password, customer ? customer.password : '');
    if (!customer || !result) {
      throw new Error('Invalid email or password');
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
};

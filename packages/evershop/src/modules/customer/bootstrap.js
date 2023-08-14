const { request } = require('express');
const { Cart } = require('../checkout/services/cart/Cart');
const { v4: uuidv4 } = require('uuid');
const {
  getTokenCookieId
} = require('@evershop/evershop/src/modules/auth/services/getTokenCookieId');
const {
  setContextValue,
  getContextValue
} = require('@evershop/evershop/src/modules/graphql/services/contextHelper');
const { sign } = require('jsonwebtoken');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { select, insertOnUpdate } = require('@evershop/postgres-query-builder');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');

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

  request.login = async function login(customerId) {
    const customer = await select()
      .from('customer')
      .where('uuid', '=', customerId)
      .load(pool);

    const JWT_SECRET = uuidv4();
    const sid = uuidv4();
    // Save the JWT_SECRET to the database
    await insertOnUpdate('user_token_secret', ['sid'])
      .given({
        user_id: customer.uuid,
        sid: sid,
        secret: JWT_SECRET
      })
      .execute(pool);
    delete customer.password;
    const payload = {
      sid: sid,
      customer: { ...camelCase(customer) }
    };
    const token = sign(payload, JWT_SECRET);
    setContextValue(this, 'customerTokenPayload', payload);
    setContextValue(this, 'sid', sid);
    return token;
    // Send a response with the cookie
    response.cookie(getTokenCookieId(), token, {
      httpOnly: true,
      maxAge: 1.728e8
    });
  };

  request.isCustomerLoggedIn = function isCustomerLoggedIn() {
    const customerTokenPayload = getContextValue(this, 'customerTokenPayload');

    return customerTokenPayload?.customer?.customerId ? true : false;
  };
};

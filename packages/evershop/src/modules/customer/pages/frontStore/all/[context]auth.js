const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { select } = require('@evershop/postgres-query-builder');

module.exports = async (request, response, delegate, next) => {
  const { customerID } = request.session;
  if (!customerID) {
    delete request.locals.customer;
    next();
  } else {
    // Load the customer from the database
    const customer = await select()
      .from('customer')
      .where('customer_id', '=', customerID)
      .and('status', '=', 1)
      .load(pool);

    if (!customer) {
      // The customer may not be logged in, or the account may be disabled
      // Logout the customer
      request.logoutCustomer((error) => {
        if (error) {
          next(error);
        } else {
          response.redirect(buildUrl('homepage'));
        }
      });
    } else {
      // Delete the password field
      delete customer.password;
      request.locals.customer = customer;
      next();
    }
  }
};

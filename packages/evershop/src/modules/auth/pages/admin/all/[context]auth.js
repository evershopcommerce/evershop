const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { select } = require('@evershop/postgres-query-builder');

module.exports = async (request, response, delegate, next) => {
  const { userID } = request.session;
  const customerID = this.session?.customerID;
  const storeName = this.session?.storeName;

  console.log('storeName after', storeName);
  // Load the user from the database
  const user = await select()
    .from('admin_user')
    .where('admin_user_id', '=', userID)
    .and('status', '=', 1)
    .load(pool, false);

  const customer = await select()
  .from('customer')
  .where('customer_id', '=', customerID)
  .and('status', '=', 1)
  .load(pool);

  console.log('customer after', customer);
  console.log('customerID after', customerID);

  if (!user && !customer && !storeName) {
    // The user may not be logged in, or the account may be disabled
    // Logout the user
    request.logoutUser(() => {
      // Check if current route is adminLogin
      if (
        request.currentRoute.id === 'adminLogin' ||
        request.currentRoute.id === 'adminLoginJson'
      ) {
        next();
      } else {
        response.redirect(buildUrl('login'));
      }
    });
  } else if (user){
    // Delete the password field
    delete user.password;
    request.locals.user = user;
    next();
  } else if (customer && storeName) {
    // Delete the password field
    delete customer.password;
    request.locals.user = customer;
    next();
  } else {
    response.redirect(buildUrl('login'));
  }
};

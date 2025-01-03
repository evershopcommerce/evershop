/**
 * Logout the current customer. This function must be accessed from the request object (request.logoutCustomer(callback))
 */
function logoutCustomer() {
  this.session.customerID = undefined;
  this.locals.customer = undefined;
}

module.exports = logoutCustomer;

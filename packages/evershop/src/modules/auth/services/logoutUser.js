/**
 * Logout a current user. This function must be accessed from the request object (request.logoutUser(callback))
 */
export default function logoutUser() {
  this.session.userID = undefined;
  this.locals.user = undefined;
}

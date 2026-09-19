import { hookable, hookBefore, hookAfter } from '../../../lib/util/hookable.js';

/**
 * Logout a current user. This function must be accessed from the request object (request.logoutUser(callback))
 */
// Named function expression so .name === 'logoutUser' for the hookable key
const _logoutUser = function logoutUser(this: any) {
  this.session.userID = undefined;
  this.locals.user = undefined;
};

export function logoutUser(this: any): void {
  hookable(_logoutUser.bind(this))();
}

export function hookBeforeLogoutUser(
  callback: (this: any) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('logoutUser', callback, priority);
}

export function hookAfterLogoutUser(
  callback: (this: any) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('logoutUser', callback, priority);
}

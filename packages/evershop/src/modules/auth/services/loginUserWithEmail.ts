import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';
import { hookable, hookBefore, hookAfter } from '../../../lib/util/hookable.js';
import { comparePassword } from '../../../lib/util/passwordHelper.js';
import { buildAdminUserPayload } from './buildAdminUserPayload.js';

/**
 * This function will login the admin user with email and password. This function must be accessed from the request object (request.loginUserWithEmail(email, password, callback))
 * @param {string} email
 * @param {string} password
 */
// Named function expression so .name === 'loginUserWithEmail' for the hookable key
const _loginUserWithEmail = async function loginUserWithEmail(
  this: any,
  email: string,
  password: string
): Promise<void> {
  // Escape the email to prevent SQL injection
  const userEmail = email.replace(/%/g, '\\%');
  const user = await select()
    .from('admin_user')
    .where('email', 'ILIKE', userEmail)
    .and('status', '=', 1)
    .load(pool);
  const result = comparePassword(password, user ? user.password : '');
  if (!user || !result) {
    throw new Error('Invalid email or password');
  }
  if (this.session) {
    this.session.userID = user.admin_user_id;
  }
  // Save the user in the request using a safe payload (no password)
  this.locals.user = buildAdminUserPayload(user);
};

export async function loginUserWithEmail(
  this: any,
  email: string,
  password: string
): Promise<void> {
  await hookable(_loginUserWithEmail.bind(this))(email, password);
}

export function hookBeforeLoginUserWithEmail(
  callback: (
    this: any,
    email: string,
    password: string
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('loginUserWithEmail', callback, priority);
}

export function hookAfterLoginUserWithEmail(
  callback: (
    this: any,
    email: string,
    password: string
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('loginUserWithEmail', callback, priority);
}

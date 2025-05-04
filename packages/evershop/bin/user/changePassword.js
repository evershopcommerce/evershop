require('dotenv').config();

const { error, success } = require('@evershop/evershop/src/lib/log/logger');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  hashPassword
} = require('@evershop/evershop/src/lib/util/passwordHelper');
const { update, select } = require('@evershop/postgres-query-builder');

async function updatePassword({ email, password }) {
  try {
    const user = await select()
      .from('admin_user')
      .where('email', '=', email)
      .load(pool);

    if (!user) {
      throw new Error('User not found');
    }
    await update('admin_user')
      .given({
        password: hashPassword(password)
      })
      .where('admin_user_id', '=', user.admin_user_id)
      .execute(pool);
    success('Password is updated successfully');
    process.exit(0);
  } catch (e) {
    error(e);
    process.exit(0);
  }
}

module.exports = {
  updatePassword
};

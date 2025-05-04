require('dotenv').config();
const { error, success } = require('@evershop/evershop/src/lib/log/logger');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  hashPassword
} = require('@evershop/evershop/src/lib/util/passwordHelper');
const { insertOnUpdate } = require('@evershop/postgres-query-builder');

async function createAdminUser({ name: full_name, email, password }) {
  // Insert the admin user
  try {
    await insertOnUpdate('admin_user', ['email'])
      .given({
        full_name,
        email,
        password: hashPassword(password)
      })
      .execute(pool);
    success('Admin user created successfully');
    process.exit(0);
  } catch (e) {
    error(e);
    process.exit(0);
  }
}

module.exports = {
  createAdminUser
};
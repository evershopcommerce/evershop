require('dotenv').config();
const { error, success } = require('@evershop/evershop/src/lib/log/logger');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  hashPassword
} = require('@evershop/evershop/src/lib/util/passwordHelper');
const { insertOnUpdate } = require('@evershop/postgres-query-builder');
const yargs = require('yargs');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return password.length >= 8;
}

const { argv } = yargs
  .option('name', {
    alias: 'n',
    description: 'Admin user full name',
    demandOption: true,
    type: 'string',
    validate: (name) => {
      if (name.length === 0) {
        throw new Error('Full name is required');
      }
      return true;
    }
  })
  .option('email', {
    alias: 'e',
    description: 'User email',
    demandOption: true,
    type: 'string',
    validate: (email) => {
      if (!isValidEmail(email)) {
        throw new Error('Invalid email format');
      }
      return true;
    }
  })
  .option('password', {
    alias: 'p',
    description: 'User password',
    demandOption: true,
    type: 'string'
  })
  .check((argv) => {
    if (!isValidPassword(argv.password)) {
      throw new Error(
        'Invalid password. Password must be at least 8 characters long'
      );
    }
    return true;
  })
  .help();

async function createAdminUser() {
  const { name: full_name, email, password } = argv;
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

createAdminUser();

/* eslint-disable no-await-in-loop */
const { readFileSync } = require('fs');
const { writeFile, mkdir } = require('fs').promises;
const path = require('path');
const { green } = require('kleur');
const ora = require('ora');
const boxen = require('boxen');
const { Pool } = require('pg');
const {
  execute,
  startTransaction,
  commit,
  rollback
} = require('@evershop/postgres-query-builder');
const { prompt } = require('enquirer');
const { CONSTANTS } = require('@evershop/evershop/src/lib/helpers');
const { error, success } = require('@evershop/evershop/src/lib/log/debuger');
const { migrate } = require('./migrate');
const { createMigrationTable } = require('./createMigrationTable');

async function install() {
  // eslint-disable-next-line no-var
  var db;
  // eslint-disable-next-line no-var
  var adminUser;

  success(
    boxen(green('Welcome to EverShop - The open-source e-commerce platform'), {
      title: 'EverShop',
      titleAlignment: 'center',
      padding: 1,
      margin: 1,
      borderColor: 'green'
    })
  );

  const dbQuestions = [
    {
      type: 'input',
      name: 'databaseHost',
      message: 'Postgres Database Host (localhost)',
      initial: 'localhost'
    },
    {
      type: 'input',
      name: 'databasePort',
      message: 'Postgres Database Port (5432)',
      initial: 5432
    },
    {
      type: 'input',
      name: 'databaseName',
      message: 'Postgres Database Name (evershop)',
      initial: 'evershop'
    },
    {
      type: 'input',
      name: 'databaseUser',
      message: 'Postgres Database User (postgres)',
      initial: 'postgres'
    },
    {
      type: 'input',
      name: 'databasePassword',
      message: 'PostgreSQL Database Password (<empty>)',
      initial: ''
    }
  ];

  try {
    db = await prompt(dbQuestions);
  } catch (e) {
    process.exit(0);
  }

  let pool = new Pool({
    host: db.databaseHost,
    port: db.databasePort,
    user: db.databaseUser,
    password: db.databasePassword,
    database: db.databaseName,
    max: 30,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: {
      rejectUnauthorized: false
    }
  });

  // Test the secure connection
  try {
    await pool.query(`SELECT 1`);
  } catch (e) {
    if (e.message.includes('does not support SSL')) {
      pool = new Pool({
        host: db.databaseHost,
        port: db.databasePort,
        user: db.databaseUser,
        password: db.databasePassword,
        database: db.databaseName,
        dateStrings: true,
        connectionLimit: 10
      });
    } else {
      error(e);
      process.exit(0);
    }
  }

  // Check postgres database version
  try {
    const { rows } = await execute(pool, `SHOW SERVER_VERSION;`);
    if (rows[0].server_version < '13.0') {
      error(
        `Your database server version(${rows[0].server_version}) is not supported. Please upgrade to PostgreSQL version 13.0 or higher`
      );
      process.exit(0);
    }
  } catch (e) {
    error(e);
    process.exit(0);
  }

  const adminUserQuestions = [
    {
      type: 'input',
      name: 'fullName',
      message: 'Your full name'
    },
    {
      type: 'input',
      name: 'email',
      message: 'Your administrator user email',
      validate: (value) => {
        if (
          !value.match(
            // eslint-disable-next-line no-useless-escape
            /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
          )
        ) {
          return 'Invalid email';
        }
        return true;
      }
    },
    {
      type: 'password',
      name: 'password',
      message: 'Your administrator user password',
      validate: (value) => {
        if (value.length < 8) {
          return 'Your password must be at least 8 characters.';
        }
        if (value.search(/[a-z]/i) < 0) {
          return 'Your password must contain at least one letter.';
        }
        if (value.search(/[0-9]/) < 0) {
          return 'Your password must contain at least one digit.';
        }
        return true;
      }
    }
  ];

  try {
    adminUser = await prompt(adminUserQuestions);
  } catch (e) {
    process.exit(0);
  }

  /* Start installation */
  const messages = [];
  messages.push(`\n\n${green('EverShop is being installed ☕ ☕ ☕')}`);
  messages.push('Creating configuration file');
  const spinner = ora({
    text: green(messages.join('\n')),
    spinner: 'dots12'
  }).start();
  spinner.start();

  /* Create folders */
  await mkdir(path.resolve(CONSTANTS.ROOTPATH, 'config'), { recursive: true });
  const configuration = JSON.parse(
    readFileSync(path.resolve(__dirname, './templates/config.json'), 'utf-8')
  );

  // Update databse information
  configuration.system.database = {
    host: db.databaseHost,
    port: db.databasePort,
    database: db.databaseName,
    user: db.databaseUser,
    password: db.databasePassword
  };

  // Create a configuration file
  await writeFile(
    path.resolve(CONSTANTS.ROOTPATH, 'config', 'default.json'),
    JSON.stringify(configuration, null, 4)
  );

  // Reload configuration
  delete require.cache[require.resolve('config')];
  require('config');

  messages.pop();
  messages.push(green('✔ Create configuration file'));
  spinner.text = messages.join('\n');

  // Create `media` folder
  await mkdir(path.resolve(CONSTANTS.ROOTPATH, 'media'), { recursive: true });

  // Start install database
  messages.push(green('Setting up a database'));
  spinner.text = messages.join('\n');

  const connection = await pool.connect();
  startTransaction(connection);
  try {
    await createMigrationTable(connection);
  } catch (e) {
    rollback(connection);
    error(e);
    process.exit(0);
  }

  const modules = [
    {
      name: 'auth',
      resolve: path.resolve(__dirname, '../../src/modules/auth')
    },
    {
      name: 'base',
      resolve: path.resolve(__dirname, '../../src/modules/base')
    },
    {
      name: 'catalog',
      resolve: path.resolve(__dirname, '../../src/modules/catalog')
    },
    {
      name: 'checkout',
      resolve: path.resolve(__dirname, '../../src/modules/checkout')
    },
    {
      name: 'cms',
      resolve: path.resolve(__dirname, '../../src/modules/cms')
    },
    {
      name: 'cod',
      resolve: path.resolve(__dirname, '../../src/modules/cod')
    },
    {
      name: 'customer',
      resolve: path.resolve(__dirname, '../../src/modules/customer')
    },
    {
      name: 'graphql',
      resolve: path.resolve(__dirname, '../../src/modules/graphql')
    },
    {
      name: 'paypal',
      resolve: path.resolve(__dirname, '../../src/modules/paypal')
    },
    {
      name: 'promotion',
      resolve: path.resolve(__dirname, '../../src/modules/promotion')
    },
    {
      name: 'setting',
      resolve: path.resolve(__dirname, '../../src/modules/setting')
    },
    {
      name: 'stripe',
      resolve: path.resolve(__dirname, '../../src/modules/stripe')
    }
  ];

  try {
    await migrate(connection, modules, adminUser);
    commit(connection);
  } catch (e) {
    rollback(connection);
    error(e);
    process.exit(0);
  }
  messages.pop();
  messages.push(green('✔ Setup database'));
  messages.push(green('✔ Create admin user'));
  spinner.succeed(messages.join('\n'));

  success(
    boxen(
      green(
        'Installation completed!. Run `npm run build` and `npm run start` to launch your store'
      ),
      {
        title: 'EverShop',
        titleAlignment: 'center',
        padding: 1,
        margin: 1,
        borderColor: 'green'
      }
    )
  );
  process.exit(0);
}

// eslint-disable-next-line func-names
(async () => {
  try {
    await install();
  } catch (e) {
    error(e);
    process.exit(0);
  }
})();

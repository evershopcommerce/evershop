/* eslint-disable no-await-in-loop */
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
  rollback,
  insertOnUpdate
} = require('@evershop/postgres-query-builder');
const { prompt } = require('enquirer');
const { CONSTANTS } = require('@evershop/evershop/src/lib/helpers');
const { error, success } = require('@evershop/evershop/src/lib/log/logger');
const {
  hashPassword
} = require('@evershop/evershop/src/lib/util/passwordHelper');

// The installation command will create a .env file in the root directory of the project.
// If you are using docker, do not run this command. Instead, you should set the environment variables in the docker-compose.yml file and run `npm run start`
// This command means for the developer who want to install the system on their local machine.
async function install() {
  // Check if the env for database is set
  if (process.env.DB_HOST) {
    error(
      'We found that you have already set the environment variables for the database. Look like you have already installed the system. Run `npm run build` and `npm run start` to launch your store.'
    );
    process.exit(0);
  }
  // eslint-disable-next-line no-var,vars-on-top
  var db;
  // eslint-disable-next-line no-var,vars-on-top
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
      initial: process.env.DB_HOST || 'localhost',
      skip: !!process.env.DB_HOST
    },
    {
      type: 'input',
      name: 'databasePort',
      message: 'Postgres Database Port (5432)',
      initial: process.env.DB_PORT || 5432,
      skip: !!process.env.DB_PORT
    },
    {
      type: 'input',
      name: 'databaseName',
      message: 'Postgres Database Name (evershop)',
      initial: process.env.DB_NAME || 'evershop',
      skip: !!process.env.DB_NAME
    },
    {
      type: 'input',
      name: 'databaseUser',
      message: 'Postgres Database User (postgres)',
      initial: process.env.DB_USER || 'postgres',
      skip: !!process.env.DB_USER
    },
    {
      type: 'input',
      name: 'databasePassword',
      message: 'PostgreSQL Database Password (<empty>)',
      initial: process.env.DB_PASSWORD || '',
      skip: !!process.env.DB_PASSWORD
    }
  ];

  try {
    db = await prompt(dbQuestions);
  } catch (e) {
    process.exit(0);
  }

  const baseDBSetting = {
    host: db.databaseHost,
    port: db.databasePort,
    user: db.databaseUser,
    password: db.databasePassword,
    database: db.databaseName,
    max: 10,
    idleTimeoutMillis: 30000
  };

  // We will try with SSL option enabled first
  let pool = new Pool({ ...baseDBSetting, ssl: true });
  let sslMode;

  // Test the secure connection
  try {
    await pool.query(`SELECT 1`);
    sslMode = 'require';
  } catch (e) {
    if (e.message.includes('does not support SSL')) {
      // If the database does not support SSL, we will try to connect without SSL
      pool = new Pool({ ...baseDBSetting, ssl: false });
      sslMode = 'disable';
    } else if (e.message.includes('certificate')) {
      error(
        `Looks like your database server does not have a valid SSL certificate. Please turn off the SSL option in the database configuration, restart the database server and try again.`
      );
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
      message: 'Your full name',
      initial: process.env.ADMIN_FULLNAME || '',
      skip: !!process.env.ADMIN_FULLNAME
    },
    {
      type: 'input',
      name: 'email',
      message: 'Your administrator user email',
      initial: process.env.ADMIN_EMAIL || 'admin@admin.com',
      skip: !!process.env.ADMIN_EMAIL,
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
      initial: process.env.ADMIN_PASSWORD || '123456',
      skip: !!process.env.ADMIN_PASSWORD,
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
  messages.push('Creating .env file');
  const spinner = ora({
    text: green(messages.join('\n')),
    spinner: 'dots12'
  }).start();
  spinner.start();

  /** Create the .env file at the root folder with the database connection */
  await writeFile(
    path.resolve(CONSTANTS.ROOTPATH, '.env'),
    `DB_HOST="${db.databaseHost}"
DB_PORT="${db.databasePort}"
DB_NAME="${db.databaseName}"
DB_USER="${db.databaseUser}"
DB_PASSWORD="${db.databasePassword}"
DB_SSLMODE="${sslMode}"
`
  );

  messages.pop();
  messages.push(green('✔ Created .env file'));
  spinner.text = messages.join('\n');

  // Create `media` folder
  await mkdir(path.resolve(CONSTANTS.ROOTPATH, 'media'), { recursive: true });

  // Create `public` folder
  await mkdir(path.resolve(CONSTANTS.ROOTPATH, 'public'), { recursive: true });

  // Start install database
  messages.push(green('Setting up a database'));
  spinner.text = messages.join('\n');

  const connection = await pool.connect();
  await startTransaction(connection);
  try {
    // Create the admin user
    const passwordHash = hashPassword(adminUser.password || '123456');
    await execute(
      connection,
      `CREATE TABLE IF NOT EXISTS "admin_user" (
        "admin_user_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
        "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
        "status" boolean NOT NULL DEFAULT TRUE,
        "email" varchar NOT NULL,
        "password" varchar NOT NULL,
        "full_name" varchar DEFAULT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ADMIN_USER_EMAIL_UNIQUE" UNIQUE ("email"),
        CONSTRAINT "ADMIN_USER_UUID_UNIQUE" UNIQUE ("uuid")
      );`
    );
    await insertOnUpdate('admin_user', ['email'])
      .given({
        status: 1,
        email: adminUser?.email || 'admin@evershop.io',
        password: passwordHash,
        full_name: adminUser?.fullName || 'Admin'
      })
      .execute(connection);
    await commit(connection);
  } catch (e) {
    await rollback(connection);
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

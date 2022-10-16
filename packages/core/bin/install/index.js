/* eslint-disable no-await-in-loop */
const { readFileSync } = require('fs');
const { writeFile, mkdir } = require('fs').promises;
const path = require('path');
const { red, green } = require('kleur');
const ora = require('ora');
const boxen = require('boxen');
const mysql = require('mysql');
const { execute } = require('@evershop/mysql-query-builder');
const { prompt } = require('enquirer');
const { CONSTANTS } = require('../../src/lib/helpers');
const { migrate } = require('./migrate');
const { createMigrationTable } = require('./createMigrationTable');

function error(message) {
  console.log(`\n❌ ${red(message)}`);
}

// eslint-disable-next-line func-names
((async function () {
  // eslint-disable-next-line no-var
  var db;
  // eslint-disable-next-line no-var
  var adminUser;
  // eslint-disable-next-line no-var
  var shop;

  // eslint-disable-next-line no-console
  console.log(boxen(green('Welcome to EverShop - The open-source e-commerce platform'), {
    title: 'EverShop', titleAlignment: 'center', padding: 1, margin: 1, borderColor: 'green'
  }));

  const dbQuestions = [
    {
      type: 'input',
      name: 'databaseHost',
      message: 'MySql Database Host (localhost)',
      initial: 'localhost'
    },
    {
      type: 'input',
      name: 'databasePort',
      message: 'MySql Database Port (3306)',
      initial: 3306
    },
    {
      type: 'input',
      name: 'databaseName',
      message: 'MySql Database Name (evershop)',
      initial: 'evershop'
    },
    {
      type: 'input',
      name: 'databaseUser',
      message: 'MySql Database User (root)',
      initial: 'root'
    },
    {
      type: 'input',
      name: 'databasePassword',
      message: 'MySql Database Password (<empty>)',
      initial: ''
    }
  ];

  try {
    db = await prompt(dbQuestions);
  } catch (e) {
    process.exit(0);
  }
  const pool = mysql.createPool({
    host: db.databaseHost,
    port: db.databasePort,
    user: db.databaseUser,
    password: db.databasePassword,
    database: db.databaseName,
    dateStrings: true,
    connectionLimit: 10
  });
  // Validate the database
  try {
    const result = await execute(pool, `SELECT table_name FROM information_schema.tables WHERE table_schema = '${db.databaseName || 'nodejscart'}'`);
    if (result.length > 0) {
      error(`The '${db.databaseName}' database is not empty. Please create a new one`);
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
        if (!value.match(
          // eslint-disable-next-line no-useless-escape
          /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        )) {
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

  const shopQuestions = [
    {
      type: 'input',
      name: 'shopTitle',
      message: 'Your shop title'
    },
    {
      type: 'input',
      name: 'shopDesc',
      message: 'How you describe your shop?'
    },
    {
      type: 'input',
      name: 'shopCurrency',
      message: 'Your currency',
      initial: 'usd'
    },
    {
      type: 'input',
      name: 'shopLanguage',
      message: 'Shop language',
      initial: 'en'
    },
    {
      type: 'input',
      name: 'shopTimeZone',
      message: 'Shop TimeZone'
    }
  ];

  try {
    shop = await prompt(shopQuestions);
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
  const configuration = JSON.parse(readFileSync(path.resolve(__dirname, './templates/config.json'), 'utf-8'));

  // Update databse information
  configuration.system.database = {
    host: db.databaseHost,
    port: db.databasePort,
    database: db.databaseName,
    user: db.databaseUser,
    password: db.databasePassword
  };

  // Update shop information
  configuration.shop = {
    title: shop.shopTitle,
    description: shop.shopDesc,
    currency: shop.shopCurrency,
    weightUnit: 'kg',
    language: shop.shopLanguage,
    timezone: shop.shopTimeZone
  };

  // Create a configuration file
  await writeFile(path.resolve(CONSTANTS.ROOTPATH, 'config', 'default.json'), JSON.stringify(configuration, null, 4));

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

  try {
    await createMigrationTable(pool);
  } catch (e) {
    error(e);
    process.exit(0);
  }

  await migrate(pool, path.resolve(__dirname, '../../src/modules'), adminUser);
  messages.pop();
  messages.push(green('✔ Setup database'));
  messages.push(green('✔ Create admin user'));
  spinner.succeed(messages.join('\n'));

  // eslint-disable-next-line no-console
  console.log(boxen(green('Installation completed!. Run `npm run build` and `npm run start` to launch your store'), {
    title: 'EverShop', titleAlignment: 'center', padding: 1, margin: 1, borderColor: 'green'
  }));
  process.exit(0);
})());

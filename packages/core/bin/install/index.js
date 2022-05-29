/* eslint-disable no-await-in-loop */
const { readdirSync, existsSync, readFileSync } = require('fs');
const { writeFile, mkdir } = require('fs').promises;
const path = require('path');
const { red, green } = require('kleur');
const ora = require('ora');
const boxen = require('boxen');
const mysql = require('mysql');
const { execute, insertOnUpdate } = require('@evershop/mysql-query-builder');
const { prompt } = require('enquirer');
const semver = require('semver');
const bcrypt = require('bcrypt');
const { CONSTANTS } = require('../../src/lib/helpers');

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
      message: 'MySql Database Name (nodejscart)',
      initial: 'nodejscart'
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
      message: 'MySql Database Password (123456)',
      initial: '123456'
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
    language: shop.shopLanguage,
    timezone: shop.shopTimeZone
  };

  // Create a configuration file
  await writeFile(path.resolve(CONSTANTS.ROOTPATH, 'config', 'default.json'), JSON.stringify(configuration, null, 4));

  // Reload configuration
  delete require.cache.config;
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
    await execute(pool, `CREATE TABLE \`migration\` (
        \`migration_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
        \`module\` char(255) NOT NULL,
        \`version\` char(255) NOT NULL,
        \`status\` char(255) NOT NULL,
        \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
        \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
        PRIMARY KEY (\`migration_id\`),
        UNIQUE KEY \`MODULE_UNIQUE\` (\`module\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Migration';
    `);
  } catch (e) {
    error(e);
    process.exit(0);
  }

  const modules = readdirSync(path.resolve(__dirname, '../../src/modules'), { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  // eslint-disable-next-line no-restricted-syntax
  for (const module of modules) {
    try {
      if (existsSync(path.resolve(__dirname, '../../src/modules', module, 'migration'))) {
        const migrations = readdirSync(path.resolve(__dirname, '../../src/modules', module, 'migration'), { withFileTypes: true })
          .filter((dirent) => dirent.isFile() && dirent.name.match(/^Version-+([1-9].[0-9].[0-9])+.js$/))
          .map((dirent) => dirent.name.replace('Version-', '').replace('.js', ''))
          .sort((first, second) => semver.lt(first, second));
        // eslint-disable-next-line no-restricted-syntax
        for (const version of migrations) {
          try {
            // eslint-disable-next-line no-await-in-loop
            // eslint-disable-next-line global-require
            await (require(path.resolve(__dirname, '../../src/modules', module, 'migration', `Version-${version}.js`)))();
            // eslint-disable-next-line no-await-in-loop
            await insertOnUpdate('migration').given({
              module,
              version,
              status: 1
            })
              .execute(pool);
          } catch (e) {
            error(e);
            process.exit(0);
          }
        }

        if (migrations.length === 0) {
          await insertOnUpdate('migration').given({
            module,
            version: '1.0.0',
            status: 1
          })
            .execute(pool);
        }
      } else {
        await insertOnUpdate('migration').given({
          module,
          version: '1.0.0',
          status: 1
        })
          .execute(pool);
      }
    } catch (e) {
      error(e);
      process.exit(0);
    }
  }

  messages.pop();
  messages.push(green('✔ Setup database'));
  messages.push(green('Creating the admin user'));
  spinner.succeed(messages.join('\n'));

  await insertOnUpdate('admin_user').given({
    status: 1,
    email: adminUser.email,
    password: await bcrypt.hash(adminUser.password, 10),
    full_name: adminUser.fullName
  })
    .execute(pool);

  messages.pop();
  messages.push(green('✔ Create admin user'));
  spinner.succeed(messages.join('\n'));

  // eslint-disable-next-line no-console
  console.log(boxen(green('Installation completed!. Run `npm run build` and `npm run start` to launch your store'), {
    title: 'EverShop', titleAlignment: 'center', padding: 1, margin: 1, borderColor: 'green'
  }));
  process.exit(0);
})());

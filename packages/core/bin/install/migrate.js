const { insertOnUpdate } = require('@evershop/mysql-query-builder');
const { readdirSync, existsSync } = require('fs');
const path = require('path');
const semver = require('semver');
const bcrypt = require('bcrypt');

module.exports.migrate = async function migrate(connection, modulePath, adminUser) {
  const modules = readdirSync(path.resolve(modulePath), { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  // eslint-disable-next-line no-restricted-syntax
  for (const module of modules) {
    try {
      if (existsSync(path.resolve(modulePath, module, 'migration'))) {
        const migrations = readdirSync(path.resolve(modulePath, module, 'migration'), { withFileTypes: true })
          .filter((dirent) => dirent.isFile() && dirent.name.match(/^Version-+([1-9].[0-9].[0-9])+.js$/))
          .map((dirent) => dirent.name.replace('Version-', '').replace('.js', ''))
          .sort((first, second) => semver.lt(first, second));
        // eslint-disable-next-line no-restricted-syntax
        for (const version of migrations) {
          try {
            // eslint-disable-next-line no-await-in-loop
            // eslint-disable-next-line global-require
            await (require(path.resolve(modulePath, module, 'migration', `Version-${version}.js`)))();
            // eslint-disable-next-line no-await-in-loop
            await insertOnUpdate('migration').given({
              module,
              version,
              status: 1
            })
              .execute(connection);
          } catch (e) {
            console.error(e.message);
            process.exit(0);
          }
        }

        if (migrations.length === 0) {
          await insertOnUpdate('migration').given({
            module,
            version: '1.0.0',
            status: 1
          })
            .execute(connection);
        }
      } else {
        await insertOnUpdate('migration').given({
          module,
          version: '1.0.0',
          status: 1
        })
          .execute(connection);
      }
    } catch (e) {
      throw e;
    }
  }

  await insertOnUpdate('admin_user').given({
    status: 1,
    email: adminUser?.email || 'demo@demo.com',
    password: await bcrypt.hash(adminUser?.password || '123456', 10),
    full_name: adminUser?.fullName || 'Admin'
  })
    .execute(connection);
}
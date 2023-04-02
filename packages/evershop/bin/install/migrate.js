const { insertOnUpdate } = require('@evershop/postgres-query-builder');
const { readdirSync, existsSync } = require('fs');
const path = require('path');
const semver = require('semver');
const bcrypt = require('bcryptjs');

module.exports.migrate = async function migrate(
  connection,
  modules,
  adminUser
) {
  // const modules = readdirSync(path.resolve(modulePath), { withFileTypes: true })
  //   .filter((dirent) => dirent.isDirectory())
  //   .map((dirent) => dirent.name);

  // eslint-disable-next-line no-restricted-syntax
  for (const module of modules) {
    try {
      if (existsSync(path.resolve(module.resolve, 'migration'))) {
        const migrations = readdirSync(
          path.resolve(module.resolve, 'migration'),
          { withFileTypes: true }
        )
          .filter(
            (dirent) =>
              dirent.isFile() &&
              dirent.name.match(/^Version-+([1-9].[0-9].[0-9])+.js$/)
          )
          .map((dirent) =>
            dirent.name.replace('Version-', '').replace('.js', '')
          )
          .sort((first, second) => semver.lt(first, second));
        // eslint-disable-next-line no-restricted-syntax
        for (const version of migrations) {
          try {
            // eslint-disable-next-line no-await-in-loop
            // eslint-disable-next-line global-require
            await require(path.resolve(
              module.resolve,
              'migration',
              `Version-${version}.js`
            ))(connection);
            // eslint-disable-next-line no-await-in-loop
            await insertOnUpdate('migration', ['module'])
              .given({
                module: module.name,
                version
              })
              .execute(connection);
          } catch (e) {
            console.error(e);
            process.exit(0);
          }
        }

        if (migrations.length === 0) {
          await insertOnUpdate('migration', ['module'])
            .given({
              module: module.name,
              version: '1.0.0'
            })
            .execute(connection);
        }
      } else {
        await insertOnUpdate('migration', ['module'])
          .given({
            module: module.name,
            version: '1.0.0'
          })
          .execute(connection);
      }
    } catch (e) {
      throw e;
    }
  }

  const salt = bcrypt.genSaltSync(10);
  await insertOnUpdate('admin_user', ['email'])
    .given({
      status: 1,
      email: adminUser?.email || 'demo@demo.com',
      password: bcrypt.hashSync(adminUser?.password || '123456', salt),
      full_name: adminUser?.fullName || 'Admin'
    })
    .execute(connection);
};

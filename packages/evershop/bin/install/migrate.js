const { insertOnUpdate } = require('@evershop/postgres-query-builder');
const { readdirSync, existsSync } = require('fs');
const path = require('path');
const semver = require('semver');
const bcrypt = require('bcryptjs');
const { error } = require('@evershop/evershop/src/lib/log/debuger');

module.exports.migrate = async function migrate(
  connection,
  modules,
  adminUser
) {
  // eslint-disable-next-line no-restricted-syntax
  for (const module of modules) {
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
        .map((dirent) => dirent.name.replace('Version-', '').replace('.js', ''))
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
          error(e);
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

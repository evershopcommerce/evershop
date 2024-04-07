const path = require('path');
const semver = require('semver');
const {
  insertOnUpdate,
  select,
  startTransaction,
  commit,
  rollback
} = require('@evershop/postgres-query-builder');
const {
  getConnection,
  pool
} = require('@evershop/evershop/src/lib/postgres/connection');
const { existsSync, readdirSync } = require('fs');
const { error } = require('@evershop/evershop/src/lib/log/logger');
const { createMigrationTable } = require('../../install/createMigrationTable');

async function getCurrentInstalledVersion(module) {
  /** Check for current installed version */
  const check = await select()
    .from('migration')
    .where('module', '=', module)
    .load(pool);
  if (!check) {
    return '0.0.1';
  } else {
    return check.version;
  }
}

async function migrateModule(module) {
  /** Check if the module has migration folder, if not ignore it */
  if (!existsSync(path.resolve(module.path, 'migration'))) {
    return;
  }
  const migrations = readdirSync(path.resolve(module.path, 'migration'), {
    withFileTypes: true
  })
    .filter(
      (dirent) =>
        dirent.isFile() &&
        dirent.name.match(/^Version-+([1-9].[0-9].[0-9])+.js$/)
    )
    .map((dirent) => dirent.name.replace('Version-', '').replace('.js', ''))
    .sort((first, second) => semver.lt(first, second));

  const currentInstalledVersion = await getCurrentInstalledVersion(module.name);
  // eslint-disable-next-line no-restricted-syntax
  for (const version of migrations) {
    /** If the version is lower or equal the installed version, ignore it */
    if (semver.lte(version, currentInstalledVersion)) {
      continue;
    }
    const connection = await getConnection();
    await startTransaction(connection);
    // eslint-disable-next-line no-await-in-loop
    // eslint-disable-next-line global-require
    /** We expect the migration script to provide a function as a default export */
    try {
      await require(path.resolve(
        module.path,
        'migration',
        `Version-${version}.js`
      ))(connection);
      // eslint-disable-next-line no-await-in-loop
      await insertOnUpdate('migration', ['module'])
        .given({
          module: module.name,
          version
        })
        .execute(connection, false);
      await commit(connection);
    } catch (e) {
      await rollback(connection);
      throw new Error(
        `Migration failed for module ${module.name}, version ${version}\n${e}`
      );
    }
  }
}

module.exports.migrate = async function migrate(modules) {
  try {
    const connection = await getConnection();
    // Create a migration table if not exists. This is for the first time installation
    await createMigrationTable(connection);
    // eslint-disable-next-line no-restricted-syntax
    for (const module of modules) {
      await migrateModule(module);
    }
  } catch (e) {
    error(e);
    process.exit(0);
  }
};

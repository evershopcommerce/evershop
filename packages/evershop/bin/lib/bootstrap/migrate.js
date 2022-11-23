const path = require('path');
const semver = require('semver');
const { insertOnUpdate, select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../src/lib/mysql/connection');
const { existsSync, readdirSync } = require('fs');

async function getCurrentInstalledVersion(module) {
  /** Check for current installed version */
  const check = await select()
    .from('migration')
    .where('module', '=', module)
    .load(pool);
  if (!check) {
    return '0.0.1';
  } else {
    return check['version'];
  }
}

module.exports.migrate = async function migrate(module) {
  if (!existsSync(path.resolve(module.path, 'migration'))) {
    return;
  }
  const migrations = readdirSync(path.resolve(module.path, 'migration'), { withFileTypes: true })
    .filter((dirent) => dirent.isFile() && dirent.name.match(/^Version-+([1-9].[0-9].[0-9])+.js$/))
    .map((dirent) => dirent.name.replace('Version-', '').replace('.js', ''))
    .sort((first, second) => semver.lt(first, second));
  const currentInstalledVersion = await getCurrentInstalledVersion(module.name);
  for (const version of migrations) {
    /** If the version is lower or equal the installed version, ignore it */
    if (semver.lte(version, currentInstalledVersion)) {
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    // eslint-disable-next-line global-require
    /** We expect the migration script to provide a function as a default export */
    await (require(path.resolve(module.path, 'migration', `Version-${version}.js`)))();
    // eslint-disable-next-line no-await-in-loop
    await insertOnUpdate('migration').given({
      module: module.name,
      version,
      status: 1
    })
      .execute(pool);
  }
}
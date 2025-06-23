import { existsSync, readdirSync } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import {
  commit,
  insertOnUpdate,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import semver from 'semver';
import { error } from '../../../lib/log/logger.js';
import { getConnection, pool } from '../../../lib/postgres/connection.js';
import { createMigrationTable } from '../../install/createMigrationTable.js';

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

  for (const version of migrations) {
    /** If the version is lower or equal the installed version, ignore it */
    if (semver.lte(version, currentInstalledVersion)) {
      continue;
    }
    const connection = await getConnection();
    await startTransaction(connection);

    /** We expect the migration script to provide a function as a default export */
    try {
      const versionModule = await import(
        pathToFileURL(
          path.resolve(module.path, 'migration', `Version-${version}.js`)
        )
      );
      await versionModule.default(connection);

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

export async function migrate(modules) {
  try {
    const connection = await getConnection();
    // Create a migration table if not exists. This is for the first time installation
    await createMigrationTable(connection);

    for (const module of modules) {
      await migrateModule(module);
    }
  } catch (e) {
    error(e);
    process.exit(0);
  }
}

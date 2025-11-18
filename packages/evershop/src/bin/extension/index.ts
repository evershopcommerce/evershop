import { existsSync } from 'fs';
import { resolve } from 'path';
import { CONSTANTS } from '../../lib/helpers.js';
import { error, warning } from '../../lib/log/logger.js';
import { getConfig } from '../../lib/util/getConfig.js';
import { isDevelopmentMode } from '../../lib/util/isDevelopmentMode.js';
import { isProductionMode } from '../../lib/util/isProductionMode.js';
import { Extension } from '../../types/extension.js';
import { getCoreModules } from '../lib/loadModules.js';

let extensions: Extension[] | undefined = undefined;

function loadExtensions(): Extension[] {
  const coreModules = getCoreModules();
  const list = getConfig('system.extensions', []) as Extension[];
  const extensions: Extension[] = [];
  list.forEach((extension) => {
    if (
      coreModules.find((module) => module.name === extension.name) ||
      extensions.find((e) => e.name === extension.name)
    ) {
      throw new Error(
        `Extension ${extension.name} is invalid. extension name must be unique.`
      );
    }
    if (extension.enabled !== true) {
      warning(`Extension ${extension.name} is not enabled. Skipping.`);
      return;
    }
    if (!existsSync(extension.resolve)) {
      warning(
        `Extension ${extension.name} has resolve path ${extension.resolve} which does not exist. Skipping.`
      );
      return;
    }
    if (isProductionMode() || extension.resolve.includes('node_modules')) {
      // Make sure the folder has 'dist' subdirectory
      if (!existsSync(resolve(extension.resolve, 'dist'))) {
        error(
          `Extension '${
            extension.name
          }' must have a 'dist' directory at ${resolve(
            extension.resolve,
            'dist'
          )}. This is required for production mode.`
        );
        process.exit(1);
      } else {
        extensions.push({
          ...extension,
          path: resolve(CONSTANTS.ROOTPATH, extension.resolve, 'dist')
        });
      }
    }
    if (isDevelopmentMode() && !extension.resolve.includes('node_modules')) {
      // Make sure the folder has 'src' subdirectory
      if (!existsSync(resolve(extension.resolve, 'src'))) {
        error(
          `Extension '${
            extension.name
          }' must have a 'src' directory at ${resolve(
            extension.resolve,
            'src'
          )}`
        );
        process.exit(1);
      } else {
        extensions.push({
          ...extension,
          srcPath: resolve(extension.resolve, 'src'),
          path: resolve(extension.resolve, 'dist')
        });
      }
    }
  });

  // Sort the extensions by priority, smaller number means higher priority
  extensions.sort((a, b) => a.priority - b.priority);
  return extensions;
}

export function getEnabledExtensions() {
  if (extensions === undefined) {
    extensions = loadExtensions();
  }
  return extensions;
}

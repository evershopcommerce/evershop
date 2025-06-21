import { existsSync } from 'fs';
import { resolve } from 'path';
import { warning } from '../../lib/log/logger.js';
import { getConfig } from '../../lib/util/getConfig.js';
import { Extension } from '../../types/extension.js';
import { getCoreModules } from '../lib/loadModules.js';
import { CONSTANTS } from '../../lib/helpers.js';

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
    if (extension.syntax === 'typescript') {
      if (!existsSync(resolve(extension.resolve, 'src'))) {
        warning(
          `Extension ${
            extension.name
          } has syntax 'typescript' but does not have a 'src' directory at ${resolve(
            extension.resolve,
            'src'
          )}. Skipping.`
        );
        return;
      }
      extensions.push({
        ...extension,
        srcPath: resolve(extension.resolve, 'src'),
        path: resolve(extension.resolve, 'dist')
      });
    } else {
      extensions.push({
        ...extension,
        path: resolve(CONSTANTS.ROOTPATH, extension.resolve)
      });
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

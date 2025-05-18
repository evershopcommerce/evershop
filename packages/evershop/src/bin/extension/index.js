import { existsSync } from 'fs';
import { resolve } from 'path';
import { CONSTANTS } from '../../lib/helpers.js';
import { warning } from '../../lib/log/logger.js';
import { getConfig } from '../../lib/util/getConfig.js';
import { getCoreModules } from '../lib/loadModules.js';

let extensions;

function loadExtensions() {
  const coreModules = getCoreModules();
  const list = getConfig('system.extensions', []);
  const extensions = [];
  list.forEach((extension) => {
    if (
      coreModules.find((module) => module.name === extension.name) ||
      extensions.find((e) => e.name === extension.name)
    ) {
      throw new Error(
        `Extension ${extension.name} is invalid. extension name must be unique.`
      );
    }
    if (
      extension.enabled === true &&
      existsSync(resolve(CONSTANTS.ROOTPATH, extension.resolve))
    ) {
      extensions.push({
        ...extension,
        path: resolve(CONSTANTS.ROOTPATH, extension.resolve)
      });
    } else {
      warning(
        `Extension ${extension.name} is either disabled or the path is not existed.`
      );
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

import fs from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { CONSTANTS } from '../../helpers.js';
import { getConfig } from '../../util/getConfig.js';

export async function getTailwindConfig(route) {
  const defaultTailwindConfig = route.isAdmin
    ? await import('../../../modules/cms/services/tailwind.admin.config.js')
    : await import(
        '../../../modules/cms/services/tailwind.frontStore.config.js'
      );

  let tailwindConfig = {};
  if (!route.isAdmin) {
    // Get the current theme
    const theme = getConfig('system.theme');
    if (
      theme &&
      fs.existsSync(join(CONSTANTS.THEMEPATH, theme, 'tailwind.config.js'))
    ) {
      tailwindConfig = await import(
        pathToFileURL(join(CONSTANTS.THEMEPATH, theme, 'tailwind.config.js'))
      );
    }
  }
  // Merge defaultTailwindConfig with tailwindConfigJs
  const mergedTailwindConfig = Object.assign(
    defaultTailwindConfig.default,
    tailwindConfig.default
  );

  return mergedTailwindConfig;
}

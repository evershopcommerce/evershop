import { existsSync } from 'fs';
import { resolve } from 'path';
import { CONSTANTS } from '../helpers.js';
import { error } from '../log/logger.js';
import { getConfig } from './getConfig.js';
import isDevelopmentMode from './isDevelopmentMode.js';
import isProductionMode from './isProductionMode.js';

export type Theme = {
  name: string;
  path: string;
  srcPath?: string;
};

export function getEnabledTheme(): Theme | null {
  const themeConfig = getConfig('system.theme') as string | undefined;
  if (!themeConfig) {
    return null;
  }
  if (!existsSync(resolve(CONSTANTS.THEMEPATH, themeConfig))) {
    error(
      `Theme '${themeConfig}' does not exist in ${CONSTANTS.THEMEPATH}. 
      Please check your theme configuration in the system settings.`
    );
    process.exit(1);
  } else if (
    isDevelopmentMode() &&
    !existsSync(resolve(CONSTANTS.THEMEPATH, themeConfig, 'src'))
  ) {
    error(
      `Theme '${themeConfig}' must have a 'src' directory at ${resolve(
        CONSTANTS.THEMEPATH,
        themeConfig,
        'src'
      )}. This is required for development mode.`
    );
    process.exit(1);
  } else if (
    isProductionMode() &&
    !existsSync(resolve(CONSTANTS.THEMEPATH, themeConfig, 'dist'))
  ) {
    error(
      `Theme '${themeConfig}' must have a 'dist' directory at ${resolve(
        CONSTANTS.THEMEPATH,
        themeConfig,
        'dist'
      )}. This is required for production mode. Please run the compile command to generate the dist directory.`
    );
    process.exit(1);
  } else {
    return {
      name: themeConfig,
      path: resolve(CONSTANTS.THEMEPATH, themeConfig),
      srcPath: isDevelopmentMode()
        ? resolve(CONSTANTS.THEMEPATH, themeConfig, 'src')
        : undefined
    };
  }
}

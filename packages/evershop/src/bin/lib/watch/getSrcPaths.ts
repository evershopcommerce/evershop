import { PathLike } from 'fs';
import path from 'path';
import { getEnabledExtensions } from '../../../bin/extension/index.js';
import { CONSTANTS } from '../../../lib/helpers.js';
import { getEnabledTheme } from '../../../lib/util/getEnabledTheme.js';

export function getSrcPaths(): PathLike[] {
  const extensions = getEnabledExtensions();
  const theme = getEnabledTheme();
  return extensions
    .filter((ext) => ext.srcPath)
    .map((ext) => ext.srcPath as PathLike)
    .concat(
      path.resolve(CONSTANTS.ROOTPATH, 'packages/evershop/src/') as PathLike
    )
    .concat(theme?.srcPath ? (theme.srcPath as PathLike) : []);
}

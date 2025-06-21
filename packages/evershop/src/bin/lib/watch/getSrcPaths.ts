import { PathLike } from 'fs';
import path from 'path';
import { getEnabledExtensions } from '../../../bin/extension/index.js';
import { CONSTANTS } from '../../../lib/helpers.js';

export function getSrcPaths(): PathLike[] {
  const extensions = getEnabledExtensions();
  return extensions
    .filter((ext) => ext.syntax === 'typescript')
    .map((ext) => ext.srcPath as PathLike)
    .concat(
      path.resolve(CONSTANTS.ROOTPATH, 'packages/evershop/src/') as PathLike
    );
}

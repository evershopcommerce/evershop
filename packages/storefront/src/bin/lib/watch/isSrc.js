import path from 'path';
import { getSrcPaths } from './getSrcPaths.js';

export function isSrc(pathName) {
  if (
    getSrcPaths().some((srcPath) => pathName.startsWith(srcPath + path.sep))
  ) {
    return true;
  } else {
    return false;
  }
}

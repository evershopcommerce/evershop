import path from 'path';
import { getDistPaths } from './getDistPaths.js';

export function isDist(pathName) {
  if (
    getDistPaths().some((distPath) => pathName.startsWith(distPath + path.sep))
  ) {
    return true;
  } else {
    return false;
  }
}

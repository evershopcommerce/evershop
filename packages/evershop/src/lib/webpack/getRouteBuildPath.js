import path from 'path';
import { CONSTANTS } from '../helpers.js';
import { getRouteBuildSubPath } from './getRouteBuildSubPath.js';

export function getRouteBuildPath(route) {
  const subPath = getRouteBuildSubPath(route);
  return path.resolve(CONSTANTS.BUILDPATH, subPath);
}

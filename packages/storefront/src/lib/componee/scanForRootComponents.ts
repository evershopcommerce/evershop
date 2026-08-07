import { join, normalize } from 'path';
import fg from 'fast-glob';
import { getEnabledExtensions } from '../../bin/extension/index.js';
import { CONSTANTS } from '../helpers.js';
import { getConfig } from '../util/getConfig.js';

/**
 * Scans for files matching a glob pattern within a list of specified locations.
 * This function is optimized for speed by using fast-glob.
 *
 * @param {function} callback - Optional callback to process the found files.
 * @returns {Promise<string[]>} A promise that resolves to an array of absolute file paths.
 */
export async function scanForRootComponents(callback): Promise<string[]> {
  const pattern = '/[A-Z]*.js';
  const extensions = getEnabledExtensions();
  const locations = [join(CONSTANTS.MODULESPATH, '/*/pages/*/*/')];
  for (const ext of extensions) {
    locations.push(join(ext.path, 'pages/*/*/'));
  }
  const theme = getConfig('system.theme') as string | undefined;
  if (theme) {
    locations.push(join(CONSTANTS.ROOTPATH, `/themes/${theme}/dist/pages/*/`));
  }
  const normalizedLocations = locations.map((loc) => normalize(loc));

  const globPatterns = normalizedLocations.map((loc) => `${loc}/${pattern}`);

  const files = await fg(globPatterns, {
    absolute: true,
    onlyFiles: true,
    unique: true
  });
  if (callback) {
    await callback(files);
  }
  return files;
}

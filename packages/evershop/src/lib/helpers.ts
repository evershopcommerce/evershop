import path from 'path';
import { fileURLToPath } from 'url';
import { toInt } from './util/coerce.js';
import { getConfig } from './util/getConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootPath = __dirname.includes(
  path.join('node_modules', '@evershop', 'evershop')
)
  ? process.cwd()
  : path.resolve(__dirname, '..', '..', '..', '..');

export const CONSTANTS = Object.freeze({
  ROOTPATH: rootPath,
  LIBPATH: path.resolve(__dirname),
  MODULESPATH: path.resolve(__dirname, '..', 'modules'),
  PUBLICPATH: path.resolve(rootPath, 'public'),
  MEDIAPATH: path.resolve(rootPath, 'media'),
  NODEMODULEPATH: path.resolve(rootPath, 'node_modules'),
  THEMEPATH: path.resolve(rootPath, 'themes'),
  CACHEPATH: path.resolve(rootPath, '.evershop'),
  BUILDPATH: path.resolve(rootPath, '.evershop', 'build'),
  ADMIN_COLLECTION_SIZE: getConfig('system.admin_collection_size', 20),
  /**
   * Hard ceiling on `?limit=`, which arrives on a PUBLIC query string. 200 is
   * the largest option the admin grid offers, so nothing legitimate is clipped.
   *
   * Coerced rather than read raw: config can come from an env var, so the value
   * may be a string, and `Math.min(n, '200')` or a NaN would put garbage into
   * `LIMIT`. `Math.max(1, …)` keeps a misconfigured 0 or negative from making
   * every listing empty.
   */
  MAX_COLLECTION_SIZE: Math.max(
    1,
    toInt(getConfig('system.max_collection_size', 200), 200)
  )
});

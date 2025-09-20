import { existsSync, statSync } from 'fs';
import { join, normalize, extname } from 'path';
import staticMiddleware from 'serve-static';
import { CONSTANTS } from '../helpers.js';

// Define allowed file extensions (whitelist)
const ALLOWED_EXTENSIONS = [
  // Images
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.svg',
  '.webp',
  '.avif',
  '.ico',

  // Styles
  '.css',
  '.scss',
  '.less',

  // Scripts
  '.js',
  '.jsx',
  '.mjs',
  '.ts',
  '.tsx',

  // Fonts
  '.woff',
  '.woff2',
  '.eot',
  '.ttf',
  '.otf',

  // Documents
  '.pdf',

  // Data
  '.json',
  '.map'
];

/**
 * Validates if the path is a valid file and its extension is allowed
 * @param {string} fullPath - Full path to the file
 * @returns {boolean} True if the path is valid and allowed
 */
const isValidFile = (fullPath) => {
  try {
    // Check if file exists and is a file (not a directory)
    const stats = statSync(fullPath);
    if (!stats.isFile()) {
      return false;
    }

    // Check if the file extension is in the allowed list
    const ext = extname(fullPath).toLowerCase();
    return ALLOWED_EXTENSIONS.includes(ext);
  } catch (error) {
    // File doesn't exist or other error
    return false;
  }
};

export default (request, response, next) => {
  let path;
  if (request.isAdmin === true) {
    path = normalize(request.originalUrl.replace('/admin/assets/', ''));
  } else {
    path = normalize(request.originalUrl.replace('/assets/', ''));
  }

  // Prevent path traversal attacks
  if (path.includes('..')) {
    return response.status(403).send('Forbidden');
  }

  if (request.isAdmin === true) {
    request.originalUrl = request.originalUrl.replace('/admin/assets', '');
    request.url = request.originalUrl.replace('/admin/assets', '');
  } else {
    request.originalUrl = request.originalUrl.replace('/assets', '');
    request.url = request.originalUrl.replace('/assets', '');
  }

  if (path.endsWith('/')) {
    return response.status(404).send('Not Found');
  }

  // Check build path
  const buildPath = join(CONSTANTS.ROOTPATH, '.evershop/build', path);
  if (existsSync(buildPath) && isValidFile(buildPath)) {
    return staticMiddleware(join(CONSTANTS.ROOTPATH, '.evershop/build'))(
      request,
      response,
      next
    );
  }

  // Check media path
  const mediaPath = join(CONSTANTS.MEDIAPATH, path);
  if (existsSync(mediaPath) && isValidFile(mediaPath)) {
    return staticMiddleware(CONSTANTS.MEDIAPATH)(request, response, next);
  }

  // Check public path
  const publicPath = join(CONSTANTS.ROOTPATH, 'public', path);
  if (existsSync(publicPath) && isValidFile(publicPath)) {
    return staticMiddleware(join(CONSTANTS.ROOTPATH, 'public'))(
      request,
      response,
      next
    );
  }

  // If none of the above conditions are met
  return response.status(404).send('Not Found');
};

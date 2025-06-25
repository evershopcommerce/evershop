import fs from 'fs/promises';
import { join } from 'path';
import staticMiddleware from 'serve-static';
import { getConfig } from '../util/getConfig.js';
import { getEnabledTheme } from '../util/getEnabledTheme.js';

export default async function themePublicStatic(request, response, next) {
  // Get the request path
  const { path } = request;
  const theme = getEnabledTheme();
  if (!theme) {
    next();
  } else {
    try {
      if (!path.includes('.')) {
        throw new Error('No file extension');
      }
      // Asynchoronously check if the path is a file and exists in the public folder
      const test = await fs.stat(join(theme.path, 'public', path));
      if (test.isFile()) {
        // If it is a file, serve it
        staticMiddleware(join(theme.path, 'public'))(request, response, next);
      }
    } catch (e) {
      // If the path is not a file or does not exist in the public folder, call next
      next();
    }
  }
}

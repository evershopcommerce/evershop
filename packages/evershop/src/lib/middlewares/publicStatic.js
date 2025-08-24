import fs from 'fs';
import { join } from 'path';
import staticMiddleware from 'serve-static';
import { CONSTANTS } from '../helpers.js';

export default async function publicStatic(request, response, next) {
  // Get the request path
  const { path } = request;
  try {
    // If no file extension, skip to next middleware early
    if (!path.includes('.')) {
      return next();
    }

    // Use promises API instead of callback-based fs.stat
    const { promises: fsp } = fs;
    const filePath = join(CONSTANTS.ROOTPATH, 'public', path);
    const stat = await fsp.stat(filePath);

    if (stat.isFile()) {
      // If it is a file, serve it
      return staticMiddleware(join(CONSTANTS.ROOTPATH, 'public'))(
        request,
        response,
        next
      );
    }

    // Not a file, continue
    return next();
  } catch (e) {
    // If the path is not a file or does not exist in the public folder, call next
    return next();
  }
}

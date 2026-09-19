import fs from 'fs/promises';
import { join } from 'path';
import staticMiddleware from 'serve-static';
import { EvershopRequest } from '../../types/request.js';
import { EvershopResponse } from '../../types/response.js';
import { CONSTANTS } from '../helpers.js';

export default async function publicStatic(
  request: EvershopRequest,
  response: EvershopResponse,
  next
) {
  // Get the request path
  const { path } = request;
  try {
    if (!path.includes('.')) {
      throw new Error('No file extension');
    }
    // Asynchoronously check if the path is a file and exists in the public folder
    const test = await fs.stat(join(CONSTANTS.ROOTPATH, 'public', path));
    if (test.isFile()) {
      // If it is a file, serve it
      staticMiddleware(join(CONSTANTS.ROOTPATH, 'public'))(
        request,
        response,
        next
      );
    }
  } catch (e) {
    // If the path is not a file or does not exist in the public folder, call next
    next();
  }
}

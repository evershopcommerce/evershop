import { basename, normalize } from 'path';
import { error } from '../../../src/lib/log/logger.js';
import { Handler } from '../../../src/lib/middleware/Handler.js';
import { broadcash } from './broadcash.js';

export function watchMF(event, path) {
  // Check if path include graphql/types
  if (
    !path.includes(normalize('pages/admin')) &&
    !path.includes(normalize('pages/frontStore')) &&
    !path.includes(normalize('pages/global')) &&
    !path.includes(normalize('api/'))
  ) {
    return;
  }

  // Check if the file name is capitalized, then it is not a middleware
  const fileName = basename(path);
  if (fileName[0] !== '[' && fileName[0] === fileName[0].toUpperCase()) {
    return;
  }

  if (event === 'change') {
    delete require.cache[require.resolve(path)];
  }
  if (event === 'unlink') {
    Handler.removeMiddleware(path);
  }
  if (event === 'add') {
    Handler.addMiddlewareFromPath(path);
  }
  try {
    broadcash();
  } catch (e) {
    error(`Hot Reload Error: ${e.message}`);
  }
}

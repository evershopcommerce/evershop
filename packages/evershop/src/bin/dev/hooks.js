import { isBuiltin } from 'node:module';
import path from 'node:path';

const maps = new Map();
export function resolve(specifier, context, nextResolve) {
  if (
    isBuiltin(specifier) ||
    specifier.includes('?t=') ||
    context.parentURL === undefined
  ) {
    return nextResolve(specifier, context);
  } else {
    const parrentURL = context.parentURL?.replace(/\.[^/.]+$/, '');
    // Convert parrentURL to a file path
    const parentPath = new URL(parrentURL).pathname;
    const modulePath = path.resolve(
      parentPath,
      specifier.startsWith('./') ? specifier.slice(2) : specifier
    );
    if (modulePath.includes('node_modules')) {
      return nextResolve(specifier, context);
    } else {
      maps.set(modulePath, true);
      return nextResolve(specifier, context);
    }
  }
}

export function has(pathName) {
  return maps.has(pathName);
}

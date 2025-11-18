import { isBuiltin } from 'node:module';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

let broadcastChannel;

export function initialize(data) {
  broadcastChannel = data.broadcastChannel;
}

export function resolve(specifier, context, nextResolve) {
  if (
    isBuiltin(specifier) ||
    specifier.includes('?t=') ||
    context.parentURL === undefined
  ) {
    return nextResolve(specifier, context);
  } else {
    const modulePath = !specifier.startsWith('file:')
      ? path.resolve(dirname(fileURLToPath(context.parentURL)), specifier)
      : fileURLToPath(specifier);
    if (modulePath.includes('node_modules')) {
      return nextResolve(specifier, context);
    } else {
      broadcastChannel.postMessage({
        path: modulePath,
      });
      return nextResolve(specifier, context);
    }
  }
}
import { existsSync } from 'fs';
import path from 'path';

export const loadBootstrapScript = async function loadBootstrapScript(module) {
  if (existsSync(path.resolve(module.path, 'bootstrap.js'))) {
    /** We expect the bootstrap script to provide a function as a default export */
    const bootstrap = await import(path.resolve(module.path, 'bootstrap.js'));
    if (typeof bootstrap.default !== 'function') {
      throw new Error(
        'Bootstrap script must provide a default export as a function'
      );
    }
    await bootstrap.default();
  }
};

import { existsSync } from 'fs';
import path from 'path';

interface Module {
  path: string;
}

type BootstrapModule = {
  default: () => Promise<void> | void;
};

/**
 * Loads and runs the bootstrap script from a module directory.
 * Prefers `bootstrap.js`, falls back to `bootstrap.ts` if not found.
 */
export const loadBootstrapScript = async function loadBootstrapScript(
  module: Module
): Promise<void> {
  const jsPath = path.resolve(module.path, 'bootstrap.js');
  const tsPath = path.resolve(module.path, 'bootstrap.ts');

  const bootstrapPath = existsSync(jsPath)
    ? jsPath
    : existsSync(tsPath)
    ? tsPath
    : null;

  if (!bootstrapPath) {
    return;
  }

  const bootstrap = (await import(bootstrapPath)) as BootstrapModule;

  if (typeof bootstrap.default !== 'function') {
    throw new Error(
      'Bootstrap script must provide a default export as a function'
    );
  }

  await bootstrap.default();
};

import { existsSync } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

interface Module {
  path: string;
}

export type BootstrapContext = {
  command?: string;
  env?: 'production' | 'development' | 'test';
  process?: 'main' | 'cronjob' | 'event';
};

type BootstrapModule = {
  default: (context: BootstrapContext) => Promise<void> | void;
};

/**
 * Loads and runs the bootstrap script from a module directory.
 */
export const loadBootstrapScript = async function loadBootstrapScript(
  module: Module,
  context: BootstrapContext = {}
): Promise<void> {
  const filePath = path.resolve(module.path, 'bootstrap.js');
  if (!existsSync(filePath)) {
    return;
  }
  // Convert path to a URL
  const bootstrapPath = pathToFileURL(filePath).toString();
  const bootstrap = (await import(bootstrapPath)) as BootstrapModule;

  if (typeof bootstrap.default !== 'function') {
    throw new Error(
      'Bootstrap script must provide a default export as a function'
    );
  }

  await bootstrap.default(context);
};

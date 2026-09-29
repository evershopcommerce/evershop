import { loadModuleRoutes } from '../../lib/router/loadModuleRoutes.js';
import { getEnabledExtensions } from '../extension/index.js';
import { getCoreModules } from './loadModules.js';

let loaded = false;

/**
 * Populate the route registry outside a running app.
 *
 * A CLI has no Express app, so `getRoutes()` is empty and anything that calls
 * `buildUrl` throws `Route <id> is not existed`. That bites any command that
 * uploads a file: the LOCAL storage provider builds the file's public URL from
 * the `staticAsset` route (`/assets/*`), so `theme:active` on a local-storage
 * store failed on the first image.
 *
 * Loads module metadata only — the same thing `evershop build` does before it
 * touches anything. No database, no bootstrap, no hooks; safe to call more than
 * once.
 */
export function ensureRoutesLoaded(): void {
  if (loaded) {
    return;
  }
  loaded = true;
  for (const mod of [...getCoreModules(), ...getEnabledExtensions()]) {
    try {
      loadModuleRoutes(mod.path);
    } catch {
      // A module with no routes, or an extension that cannot be read, must not
      // stop the command that needed a URL.
    }
  }
}

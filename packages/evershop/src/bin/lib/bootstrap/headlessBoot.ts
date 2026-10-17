import { lockAddressRegistry } from '../../../lib/address/formats.js';
import { lockHooks } from '../../../lib/util/hookable.js';
import { lockRegistry } from '../../../lib/util/registry.js';
import { refreshSetting } from '../../../modules/setting/services/setting.js';
import { getEnabledExtensions } from '../../extension/index.js';
import { ensureRoutesLoaded } from '../ensureRoutesLoaded.js';
import { getCoreModules } from '../loadModules.js';
import { loadBootstrapScript } from './bootstrap.js';
import { runHeadlessBoot } from './runHeadlessBoot.js';
import type { HeadlessBootOptions } from './runHeadlessBoot.js';

/**
 * Boots a process that has no Express app. The sequence and its tests are in
 * `runHeadlessBoot.ts`; this file only wires the real modules into it.
 */
export function headlessBoot(options: HeadlessBootOptions): Promise<void> {
  return runHeadlessBoot(options, {
    modules: () => [...getCoreModules(), ...getEnabledExtensions()],
    loadBootstrapScript,
    lockHooks,
    lockRegistry,
    lockAddressRegistry,
    refreshSetting,
    ensureRoutesLoaded
  });
}

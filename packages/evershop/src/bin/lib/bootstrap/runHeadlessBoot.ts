import type { BootstrapContext } from './bootstrap.js';

export interface BootModule {
  path: string;
}

/**
 * Everything the boot touches, so that a test can replace it. The real ones are
 * wired in `headlessBoot.ts`.
 */
export interface HeadlessBootDeps {
  /** Core modules, then enabled extensions. */
  modules(): BootModule[];
  loadBootstrapScript(
    module: BootModule,
    context: BootstrapContext
  ): Promise<void>;
  lockHooks(): void;
  lockRegistry(): void;
  lockAddressRegistry(): void;
  refreshSetting(): Promise<void>;
  ensureRoutesLoaded(): void;
}

export interface HeadlessBootOptions {
  /** Passed to every module's bootstrap; `process` says which process this is. */
  context: BootstrapContext;
  /** The modules to boot. Default: core modules, then enabled extensions. */
  modules?: BootModule[];
  /** Load the settings once, after the bootstraps. Default false. */
  refreshSettings?: boolean;
  /** Fill the route registry, so `buildUrl` works. Default false. */
  loadRoutes?: boolean;
}

/**
 * Boots a process that has no Express app (the event process, the import
 * worker): runs the `bootstrap` of every module in order, then locks the hook
 * system, the registry and the address registry, exactly as the event process
 * has always done. Without it, what the bootstraps register (processors,
 * hooks, the address normalization seam) would be missing, and the process
 * would write data that the admin would refuse.
 *
 * The two options are off by default, so the event process, which refreshes
 * its settings before each batch of events and never builds a URL, behaves as
 * before. The import worker turns both on.
 *
 * If a bootstrap throws, nothing is locked and the error reaches the caller.
 */
export async function runHeadlessBoot(
  options: HeadlessBootOptions,
  deps: HeadlessBootDeps
): Promise<void> {
  const modules = options.modules ?? deps.modules();
  for (const module of modules) {
    // Strictly one after the other: a bootstrap may depend on an earlier one.
    await deps.loadBootstrapScript(module, options.context);
  }
  deps.lockHooks();
  deps.lockRegistry();
  deps.lockAddressRegistry();
  if (options.refreshSettings) {
    await deps.refreshSetting();
  }
  if (options.loadRoutes) {
    deps.ensureRoutesLoaded();
  }
}

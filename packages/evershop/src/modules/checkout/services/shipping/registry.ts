import { addProcessor, getValue } from '../../../../lib/util/registry.js';
import type { ShippingProvider } from '../../../../types/shippingProvider.js';

/**
 * Shipping provider registry.
 *
 * Mirrors the pattern of `registerPaymentMethod` / `registerEmailService`:
 * registrations happen in module bootstrap files via `registerShippingProvider`,
 * which routes through the global `addProcessor` machinery for module-load-
 * order preservation. The registry is auto-locked once bootstrap completes —
 * any later registration throws via `addProcessor`'s built-in locked check.
 *
 * Duplicate provider codes throw eagerly at register time (mirroring the
 * carrier and status registrants — see wiki/log.md [2026-06-03] for that
 * pass). The check uses a synchronous `Set` of already-seen codes so a
 * second `registerShippingProvider('shippo', …)` call from a second extension
 * blows up at bootstrap rather than silently shadowing the first one.
 *
 * See wiki/shipping-provider-design.md for the provider contract.
 */

const REGISTRY_KEY = 'shippingProviders' as const;

/**
 * Codes seen by `registerShippingProvider` so far. Maintained synchronously
 * so duplicate-code throws fire at the registration call, not deferred to
 * the first `getAllShippingProviders` invocation.
 */
const registeredCodes = new Set<string>();

/**
 * Register a shipping provider. Must be called from a module's bootstrap.ts.
 *
 * @throws if the registry is already locked (e.g., called from middleware).
 * @throws if the provider code is already registered.
 */
export function registerShippingProvider(provider: ShippingProvider): void {
  if (!provider || typeof provider !== 'object') {
    throw new Error('registerShippingProvider: provider must be an object');
  }
  if (!provider.code || typeof provider.code !== 'string') {
    throw new Error(
      'registerShippingProvider: provider.code is required and must be a string'
    );
  }
  if (!provider.name || typeof provider.name !== 'string') {
    throw new Error(
      'registerShippingProvider: provider.name is required and must be a string'
    );
  }
  if (typeof provider.getMethods !== 'function') {
    throw new Error(
      `registerShippingProvider: provider.getMethods is required (provider code: ${provider.code})`
    );
  }
  if (registeredCodes.has(provider.code)) {
    throw new Error(
      `Shipping provider "${provider.code}" is already registered. Each provider must have a unique code across the system.`
    );
  }
  registeredCodes.add(provider.code);
  addProcessor(REGISTRY_KEY, (providers: ShippingProvider[]) => [
    ...providers,
    provider
  ]);
}

/**
 * Return every registered shipping provider. Order matches registration order
 * across modules (which follows the alphabetical module-load order — see
 * bin/lib/loadModules.js).
 */
export async function getAllShippingProviders(): Promise<ShippingProvider[]> {
  return getValue(REGISTRY_KEY, [] as ShippingProvider[], {});
}

/**
 * Return a single provider by its `code`, or undefined if no such provider
 * is registered (or its module is not installed).
 */
export async function getShippingProvider(
  code: string
): Promise<ShippingProvider | undefined> {
  const providers = await getAllShippingProviders();
  return providers.find((p) => p.code === code);
}

/**
 * Test-only escape hatch. Clears the synchronous code-tracking set so a
 * test suite can re-register providers under a fresh bootstrap-like
 * environment. Guarded by an explicit NODE_ENV check so production-deployed
 * code can't blow up the registry. Does NOT touch the underlying
 * `addProcessor` registry — tests that need to reset that should use the
 * registry's own reset hooks.
 */
export function __resetShippingProviderRegistryForTests(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '__resetShippingProviderRegistryForTests must not be called in production'
    );
  }
  registeredCodes.clear();
}

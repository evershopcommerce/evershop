import type { Carrier } from '../../types/carrier.js';

/**
 * In-memory carrier registry. Extensions register a carrier from their
 * `bootstrap.ts` via `registerCarrier(c)`. The runtime object (with its
 * `createLabel` / `fetchStatus` / etc. method implementations) lives here.
 *
 * The registry persists nothing. The merchant's intent ("I don't want to use
 * FedEx") is already expressed by NOT selecting FedEx in the ship dialog and
 * NOT setting `default_carrier_code = 'fedex'` on any Core method — both real
 * persisted choices. A separate global enable/disable toggle would be
 * duplicate state, so there's no `carrier` DB table and no admin "carrier
 * settings" page.
 *
 * Locked at the same bootstrap-finalize point as hooks and registry
 * (`lockHooks(); lockRegistry(); lockCarrierRegistry()` in `startUp.js`).
 * Calls to `registerCarrier` after lock throw.
 *
 * See wiki/multi-shipment-design.md → "Carrier integration".
 */

const carriers = new Map<string, Carrier>();
let locked = false;

export function registerCarrier(carrier: Carrier): void {
  if (locked) {
    throw new Error(
      `Cannot register carrier '${carrier.code}' after bootstrap. ` +
        `Call registerCarrier from your extension's bootstrap.ts.`
    );
  }
  if (!carrier.code || !carrier.name) {
    throw new Error(
      `registerCarrier requires both code and name. Got: ${JSON.stringify({
        code: carrier.code,
        name: carrier.name
      })}`
    );
  }
  if (carriers.has(carrier.code)) {
    throw new Error(
      `Carrier with code '${carrier.code}' is already registered. ` +
        `Codes must be unique across all installed extensions.`
    );
  }
  carriers.set(carrier.code, carrier);
}

export function getCarrier(code: string | null | undefined): Carrier | undefined {
  if (!code) return undefined;
  return carriers.get(code);
}

export function getAllCarriers(): Carrier[] {
  return Array.from(carriers.values());
}

export function lockCarrierRegistry(): void {
  locked = true;
}

/**
 * Test-only escape hatch. Resets the in-memory map AND the lock flag so a
 * test suite can register fresh carriers under a fresh bootstrap-like
 * environment. NEVER called from production code — guarded by an explicit
 * NODE_ENV check so production-deployed code can't blow up the registry.
 */
export function __resetCarrierRegistryForTests(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '__resetCarrierRegistryForTests must not be called in production'
    );
  }
  carriers.clear();
  locked = false;
}

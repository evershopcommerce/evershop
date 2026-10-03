/**
 * The server injection point (specification § 3.4 "Injection, not imports",
 * § 3.11). Everything the server owns — merchant settings, the
 * `addressSchema` processor hook, `translate`, the request locale, the store
 * country, the zone countries — reaches the library through
 * `configureAddressRuntime`, called once from a module bootstrap. The default
 * runtime is pure and is what the unit tests and the browser bundle get.
 */
import { ADDRESS_SETTINGS_DEFAULTS } from './settings.js';
import type { AddressRuntime } from './types.js';

const RUNTIME_KEYS: readonly (keyof AddressRuntime)[] = [
  'getSettings',
  'applyHook',
  'translate',
  'getLocale',
  'getStoreCountry',
  'getZoneCountries'
];

/** Replaces `${key}` placeholders from `values`; unknown keys are left as written. */
export function interpolateAddressMessage(
  text: string,
  values?: Record<string, string>
): string {
  if (!values || typeof text !== 'string') {
    return text;
  }
  return text.replace(/\$\{\s*([\w.]+)\s*\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match
  );
}

function createDefaultRuntime(): AddressRuntime {
  return {
    getSettings: () => ADDRESS_SETTINGS_DEFAULTS,
    applyHook: (schema) => schema,
    translate: (text, values) => interpolateAddressMessage(text, values),
    getLocale: () => 'en',
    getStoreCountry: () => undefined,
    getZoneCountries: () => undefined
  };
}

let runtime: AddressRuntime = createDefaultRuntime();

/**
 * Merges the given functions over the current runtime (which starts as the
 * default), so several bootstraps may each inject the part they own. Unknown
 * keys are ignored; a non-function value throws.
 */
export function configureAddressRuntime(partial: Partial<AddressRuntime>): void {
  if (!partial || typeof partial !== 'object') {
    throw new Error('configureAddressRuntime requires an object of functions.');
  }
  const next: AddressRuntime = { ...runtime };
  for (const key of RUNTIME_KEYS) {
    const value = partial[key];
    if (value === undefined) {
      continue;
    }
    if (typeof value !== 'function') {
      throw new Error(`configureAddressRuntime: '${key}' must be a function.`);
    }
    (next as unknown as Record<string, unknown>)[key] = value;
  }
  runtime = next;
}

export function getAddressRuntime(): AddressRuntime {
  return runtime;
}

/** Back to the pure default runtime. */
export function resetAddressRuntime(): void {
  runtime = createDefaultRuntime();
}

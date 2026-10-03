/**
 * Format record registry: bundled records, package patches, the bootstrap
 * lock and the generation counter the derivation cache keys on
 * (specification § 3.2, § 3.4).
 *
 * Pure module. The generated records live in `./formats/` and are never
 * mutated: `getAddressFormat` builds a fresh object on every call.
 */
import { ADDRESS_FORMATS, DEFAULT_ADDRESS_FORMAT } from './formats/index.js';
import type { AddressFormat, AddressFormatPatch } from './types.js';

/** Registered patches per country code, in registration order. */
const patches = new Map<string, AddressFormatPatch[]>();
let locked = false;
let generation = 0;

function normalizeCode(code: string | undefined | null): string {
  return typeof code === 'string' ? code.trim().toUpperCase() : '';
}

/**
 * Copies `over` onto `base`, field by field. `undefined` values are skipped,
 * `telephone` merges key by key, `languages` is replaced whole. Nested values
 * are copied so the result never shares state with either input.
 */
function mergeFormat(
  base: Partial<AddressFormat>,
  over: Partial<AddressFormat> | undefined
): Partial<AddressFormat> {
  const result: Partial<AddressFormat> = { ...base };
  if (base.languages) {
    result.languages = [...base.languages];
  }
  if (base.telephone) {
    result.telephone = { ...base.telephone };
  }
  if (!over) {
    return result;
  }
  for (const key of Object.keys(over) as (keyof AddressFormat)[]) {
    const value = over[key];
    if (value === undefined) {
      continue;
    }
    if (key === 'telephone') {
      result.telephone = {
        ...(result.telephone ?? {}),
        ...(value as NonNullable<AddressFormat['telephone']>)
      };
    } else if (key === 'languages') {
      result.languages = [...(value as string[])];
    } else {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

/**
 * The effective record for a country: `DEFAULT` merged field by field under
 * the bundled record (a record without `fmt` or `require` inherits ZZ's), then
 * every registered patch applied in order. Unknown codes resolve to `DEFAULT`
 * (plus any patches registered for that code, so a package may add a country
 * the dataset lacks). Always a new object.
 */
export function getAddressFormat(code: string): AddressFormat {
  const cc = normalizeCode(code);
  const bundled = Object.prototype.hasOwnProperty.call(ADDRESS_FORMATS, cc)
    ? (ADDRESS_FORMATS[cc] as Partial<AddressFormat>)
    : undefined;
  let record = mergeFormat(DEFAULT_ADDRESS_FORMAT, bundled);
  for (const patch of patches.get(cc) ?? []) {
    record = mergeFormat(record, patch);
  }
  return record as AddressFormat;
}

/**
 * Overrides parts of a country's record. From `bootstrap.ts` only: throws once
 * the registry is locked. Scalars replace, `fmt`/`lfmt`/`languages` replace
 * whole, `telephone` merges key by key; patches for one code compose in order.
 */
export function patchAddressFormat(
  code: string,
  patch: AddressFormatPatch
): void {
  const cc = normalizeCode(code);
  if (locked) {
    throw new Error(
      `Cannot patch address format '${cc}' after bootstrap. ` +
        `Call patchAddressFormat from your extension's bootstrap.ts.`
    );
  }
  if (!cc) {
    throw new Error('patchAddressFormat requires a country code.');
  }
  if (!patch || typeof patch !== 'object') {
    throw new Error(`patchAddressFormat('${cc}') requires a patch object.`);
  }
  const list = patches.get(cc) ?? [];
  list.push(mergeFormat({}, patch) as AddressFormatPatch);
  patches.set(cc, list);
  bumpRegistryGeneration();
}

/** Locks every address registry (formats, region providers, extra fields). */
export function lockAddressRegistry(): void {
  locked = true;
}

export function isAddressRegistryLocked(): boolean {
  return locked;
}

/** Monotonic counter; part of the derivation cache key (§ 3.4). */
export function getRegistryGeneration(): number {
  return generation;
}

/** Bumped by every registry mutation (patches, region providers, extra fields). */
export function bumpRegistryGeneration(): void {
  generation += 1;
}

export function __resetAddressFormatsForTests(): void {
  patches.clear();
  locked = false;
  generation = 0;
}

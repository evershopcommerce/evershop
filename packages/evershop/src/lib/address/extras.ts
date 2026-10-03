/**
 * Extra (non-postal) address fields registered by extensions (specification
 * § 3.4). Values live in the `extra` JSONB column; the definitions only add
 * inputs to the derived schema. Locked with the rest of the registry.
 */
import {
  bumpRegistryGeneration,
  isAddressRegistryLocked
} from './formats.js';
import { isAddressColumn } from './tokens.js';
import type { AddressSurface, ExtraFieldDefinition } from './types.js';

/** Registration order is display order among unanchored extras. */
const extras = new Map<string, ExtraFieldDefinition>();

function cloneDefinition(def: ExtraFieldDefinition): ExtraFieldDefinition {
  const copy: ExtraFieldDefinition = {
    id: def.id,
    type: def.type,
    label: def.label,
    required: def.required ?? false
  };
  if (def.pattern) {
    copy.pattern = { ...def.pattern };
  }
  if (def.placeholder !== undefined) {
    copy.placeholder = def.placeholder;
  }
  if (def.countries) {
    copy.countries = def.countries.map((c) => c.trim().toUpperCase());
  }
  if (def.surfaces) {
    copy.surfaces = [...def.surfaces];
  }
  if (def.after !== undefined) {
    copy.after = def.after;
  }
  return copy;
}

/**
 * Registers an extra field. From `bootstrap.ts` only: throws after the lock,
 * when the id is one of the shared columns, or when the id is already taken.
 * The definition is copied; later mutation of the argument has no effect.
 */
export function registerAddressField(def: ExtraFieldDefinition): void {
  const id = def?.id;
  if (isAddressRegistryLocked()) {
    throw new Error(
      `Cannot register address field '${id}' after bootstrap. ` +
        `Call registerAddressField from your extension's bootstrap.ts.`
    );
  }
  if (typeof id !== 'string' || id.trim() === '') {
    throw new Error('registerAddressField requires a non-empty string id.');
  }
  if (isAddressColumn(id)) {
    throw new Error(
      `Address field id '${id}' collides with an address column. ` +
        `Extra fields hold non-postal data; a field the standard models belongs in the format record.`
    );
  }
  if (extras.has(id)) {
    throw new Error(
      `Address field '${id}' is already registered. ` +
        `Ids must be unique across all installed extensions.`
    );
  }
  extras.set(id, cloneDefinition(def));
  bumpRegistryGeneration();
}

/**
 * Registered extras in registration order, filtered by `countries` and
 * `surfaces`. An absent argument does not filter (every extra is returned);
 * an argument filters to extras that are unscoped or that list the value, so
 * `getAddressExtras('', surface)` yields only country-agnostic extras.
 */
export function getAddressExtras(
  country?: string,
  surface?: AddressSurface
): ExtraFieldDefinition[] {
  const cc =
    country === undefined || country === null
      ? undefined
      : country.trim().toUpperCase();
  const result: ExtraFieldDefinition[] = [];
  for (const def of extras.values()) {
    if (cc !== undefined && def.countries && !def.countries.includes(cc)) {
      continue;
    }
    if (surface !== undefined && def.surfaces && !def.surfaces.includes(surface)) {
      continue;
    }
    result.push(cloneDefinition(def));
  }
  return result;
}

export function __resetAddressExtrasForTests(): void {
  extras.clear();
}

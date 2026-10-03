/**
 * `@evershop/evershop/lib/address` — the Address Format Registry.
 *
 * Pure, isomorphic library: no `pg`, Express, `fs`, `config`, `modules/*`,
 * `lib/postgres` or `lib/util/registry` import anywhere under this folder
 * (a unit test enforces it). The server injects what it owns through
 * `configureAddressRuntime`. Specification: specifications/11-address-format-registry-specification.md.
 *
 * Module ownership (one concern per file):
 *   types.ts        public types                        tokens.ts    token ↔ column table
 *   formats/        generated country records           data/        generated countries + regions
 *   formats.ts      record registry, patching, lock     regions.ts   region providers
 *   countries.ts    country helpers                     extras.ts    non-postal extra fields
 *   settings.ts     merchant settings filter            derive.ts    record → schema
 *   runtime.ts      server injection point              labels.ts    labelType → English string
 *   validate.ts     rules from the schema               format.ts    schema → display lines
 *   names.ts        recipient ↔ parts                   display.ts   row → display values → lines
 *   integration.ts  consumer-neutral mapping
 */
export * from './types.js';
export * from './tokens.js';

export {
  getAddressFormat,
  patchAddressFormat,
  lockAddressRegistry,
  isAddressRegistryLocked,
  getRegistryGeneration,
  bumpRegistryGeneration,
  __resetAddressFormatsForTests
} from './formats.js';

export {
  registerRegionProvider,
  getRegionProvider,
  getRegionLevels,
  getRegions,
  resolveRegionName,
  regionDisplayName,
  isActiveRegionKey,
  __resetRegionProvidersForTests
} from './regions.js';

export { getCountries, getCountryName, isKnownCountry } from './countries.js';

export {
  registerAddressField,
  getAddressExtras,
  __resetAddressExtrasForTests
} from './extras.js';

export {
  ADDRESS_SETTINGS_DEFAULTS,
  normalizeAddressSettings,
  applyAddressSettings,
  resolveDefaultCountry,
  resolveSellToCountries,
  isCountryAllowed
} from './settings.js';

export {
  selectFormat,
  deriveAddressSchema,
  resolveAddressSchema,
  __resetDerivationCacheForTests
} from './derive.js';

export {
  configureAddressRuntime,
  getAddressRuntime,
  resetAddressRuntime
} from './runtime.js';

export { ADDRESS_LABELS, labelFor } from './labels.js';

export {
  validateAddress,
  validateAddressAgainstSchema,
  addAddressValidationRule,
  __resetAddressValidationRulesForTests
} from './validate.js';
export type {
  AddressTranslate,
  ValidateAddressAgainstSchemaOptions,
  AddressValidationResult
} from './validate.js';

export { formatAddress } from './format.js';
export type { FormatAddressValues, FormatAddressOptions } from './format.js';

export {
  composeRecipient,
  splitNameFallback,
  normalizeNameParts
} from './names.js';
export type { NameParts, NormalizeNamePartsOptions } from './names.js';

export { resolveAddressDisplayValues, formatAddressRow } from './display.js';
export type { AddressDisplayValues } from './display.js';

export {
  toIntegrationAddress,
  toIntegrationAddressFromRow
} from './integration.js';

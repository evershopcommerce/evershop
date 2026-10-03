/**
 * Address validation (spec § 3.5, § 3.12, § 3.13).
 *
 * Every rule is derived from a `ResolvedAddressSchema`; there is no
 * hand-written field list. `validateAddress` resolves the schema for the
 * address's country and delegates to `validateAddressAgainstSchema`, which is
 * pure apart from the injected runtime (`translate`, settings, zone countries)
 * and the region registry (`isActiveRegionKey`). Validation never mutates the
 * address; normalization happens in the data processors before save (§ 3.8).
 *
 * Errors are collected, never short-circuited, in this order:
 *   1. `unknown_field`  — payload keys that are neither a shared column, a row
 *                         metadata key, a schema field nor a registered extra
 *   2. per schema field — `required`, `type`, `pattern`, `region_invalid`
 *   3. `country`        — `required`, then `country_not_allowed` (§ 3.13)
 *   4. registered rules — `addAddressValidationRule`, registration order, awaited
 * The split-name rule (§ 3.12) adjusts which `required` checks fire in step 2.
 *
 * Why the 14 shared columns are always known keys: an API client may echo a
 * stored row back unchanged (`dependent_locality: null` on a US row), and a
 * legacy row keeps values the current schema no longer collects (name parts
 * after switching back to single mode, line 3 after disabling it). Rejecting
 * those would trap rows after a settings change, which § 3.12 and § 3.13
 * promise never happens. `unknown_field` therefore targets the typo and
 * foreign-vocabulary class (`province`, `full_name`, `address_1`) — exactly
 * the keys that used to be dropped silently (§ 1.8).
 */
import { resolveAddressSchema } from './derive.js';
import { getAddressExtras } from './extras.js';
import { isAddressRegistryLocked } from './formats.js';
import { labelFor } from './labels.js';
import { isActiveRegionKey } from './regions.js';
import { getAddressRuntime } from './runtime.js';
import { isCountryAllowed } from './settings.js';
import {
  ADDRESS_ROW_METADATA_KEYS,
  LEVEL_ORDER,
  isAddressColumn
} from './tokens.js';
import type {
  AddressError,
  AddressLevel,
  AddressRow,
  AddressSettings,
  AddressValidationRule,
  ResolvedAddressField,
  ResolvedAddressSchema,
  ValidateAddressOptions
} from './types.js';

/** `translate(text, values)` — interpolates `${key}` placeholders after translating. */
export type AddressTranslate = (
  text: string,
  values?: Record<string, string>
) => string;

export interface ValidateAddressAgainstSchemaOptions
  extends ValidateAddressOptions {
  /**
   * Extra-field ids accepted as known payload keys. Default: every extra
   * registered for the schema's country on any surface, so a value collected
   * on another form still travels with the row (§ 3.1 strict parity).
   */
  knownExtraIds?: string[];
  /** Merchant settings for the sell-to check. Default: the runtime's. */
  settings?: AddressSettings;
  /** Countries covered by at least one shipping zone. Default: the runtime's. */
  zoneCountries?: string[];
  /** Message translator. Default: the runtime's `translate`. */
  translate?: AddressTranslate;
}

export interface AddressValidationResult {
  valid: boolean;
  errors: AddressError[];
}

const NAME_FIELD_IDS = ['recipient', 'given_name', 'family_name'] as const;

/** Registration order is preserved; re-registering an id replaces the rule in place. */
const rules = new Map<string, AddressValidationRule>();

/**
 * Register a cross-field, server-only rule. Rules run after the schema-derived
 * rules, in registration order, and may be async. Must be called from a
 * module's `bootstrap.ts`: the registry is locked afterwards.
 */
export function addAddressValidationRule(rule: AddressValidationRule): void {
  if (isAddressRegistryLocked()) {
    throw new Error(
      `Cannot add address validation rule '${rule.id}' after bootstrap. Call addAddressValidationRule from your extension's bootstrap.ts.`
    );
  }
  rules.set(rule.id, rule);
}

export function __resetAddressValidationRulesForTests(): void {
  rules.clear();
}

function isBlank(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }
  return typeof value === 'string' && value.trim() === '';
}

/** Trimmed string form for comparisons and lookups; `''` for null/undefined. */
function stringOf(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  return typeof value === 'string' ? value.trim() : String(value);
}

function levelOf(id: string): AddressLevel | undefined {
  return (LEVEL_ORDER as readonly string[]).includes(id)
    ? (id as AddressLevel)
    : undefined;
}

function isExtraField(field: ResolvedAddressField): boolean {
  return field.labelType === 'extra';
}

/** Extras arrive as top-level payload keys and live in `extra` once stored. */
function valueOf(row: AddressRow, field: ResolvedAddressField): unknown {
  const direct = row[field.id];
  if (direct !== undefined && direct !== null) {
    return direct;
  }
  if (isExtraField(field) && row.extra && typeof row.extra === 'object') {
    return (row.extra as Record<string, unknown>)[field.id] ?? direct;
  }
  return direct;
}

function hasDeclaredType(field: ResolvedAddressField, value: unknown): boolean {
  if (field.type === 'number') {
    return typeof value === 'number' && Number.isFinite(value);
  }
  return typeof value === 'string';
}

/** The pattern is anchored by the derivation; anchor defensively when it is not. */
function anchored(regex: string): RegExp {
  const source =
    regex.startsWith('^') && regex.endsWith('$') ? regex : `^(?:${regex})$`;
  return new RegExp(source);
}

/**
 * Keys of the enumerated levels outside `level`, in `LEVEL_ORDER`, as the
 * region provider expects them. A free-text level is not part of the
 * provider's hierarchy and is skipped.
 */
function parentPathFor(
  schema: ResolvedAddressSchema,
  row: AddressRow,
  level: AddressLevel
): string[] {
  const path: string[] = [];
  for (const outer of LEVEL_ORDER) {
    if (outer === level) {
      break;
    }
    const enumerated = schema.fields.some(
      (field) => field.id === outer && field.optionSource === 'regions'
    );
    if (enumerated) {
      path.push(stringOf(row[outer]));
    }
  }
  return path;
}

/**
 * § 3.12: in split mode `recipient` is derived, so it is never required; the
 * parts are required on create, and on update only when a name field in the
 * payload differs from the stored row. The schema's own `required` is the
 * upper bound (a hook that relaxes a part is honoured on the server as on the
 * client).
 */
function requiredFor(
  field: ResolvedAddressField,
  splitMode: boolean,
  nameTouched: boolean
): boolean {
  if (!splitMode) {
    return field.required;
  }
  if (field.id === 'recipient') {
    return false;
  }
  if (field.id === 'given_name' || field.id === 'family_name') {
    return field.required && nameTouched;
  }
  return field.required;
}

function nameTouchedSince(
  row: AddressRow,
  previous: AddressRow | undefined
): boolean {
  if (!previous) {
    return true;
  }
  return NAME_FIELD_IDS.some(
    (id) => row[id] !== undefined && stringOf(row[id]) !== stringOf(previous[id])
  );
}

/**
 * Validate `address` against an already resolved schema. Returns every error,
 * with messages translated and the field label interpolated as `${field}`.
 */
export async function validateAddressAgainstSchema(
  address: AddressRow,
  schema: ResolvedAddressSchema,
  opts: ValidateAddressAgainstSchemaOptions = {}
): Promise<AddressValidationResult> {
  const row: AddressRow = address ?? {};
  const runtime = getAddressRuntime();
  const translate: AddressTranslate =
    opts.translate ?? ((text, values) => runtime.translate(text, values));
  const errors: AddressError[] = [];

  const fieldById = new Map<string, ResolvedAddressField>();
  for (const field of schema.fields) {
    fieldById.set(field.id, field);
  }
  const labelOf = (field: ResolvedAddressField): string =>
    translate(labelFor(field));
  const fail = (
    field: ResolvedAddressField,
    code: string,
    messageKey: string
  ): void => {
    errors.push({
      field: field.id,
      code,
      message: translate(messageKey, { field: labelOf(field) })
    });
  };

  // 1. Unknown keys.
  const knownExtraIds =
    opts.knownExtraIds ??
    getAddressExtras(schema.country).map((extra) => extra.id);
  const known = new Set<string>([
    ...ADDRESS_ROW_METADATA_KEYS,
    'country',
    ...fieldById.keys(),
    ...knownExtraIds
  ]);
  for (const key of Object.keys(row)) {
    if (known.has(key) || isAddressColumn(key)) {
      continue;
    }
    errors.push({
      field: key,
      code: 'unknown_field',
      message: translate('${field} is not a known address field', {
        field: key
      })
    });
  }

  // 2. Schema fields (country is step 3).
  const splitMode =
    fieldById.has('given_name') || fieldById.has('family_name');
  const nameTouched = splitMode && nameTouchedSince(row, opts.previous);

  for (const field of schema.fields) {
    if (field.id === 'country') {
      continue;
    }
    const value = valueOf(row, field);
    if (isBlank(value)) {
      if (requiredFor(field, splitMode, nameTouched)) {
        fail(field, 'required', '${field} is required');
      }
      continue;
    }
    if (!hasDeclaredType(field, value)) {
      fail(field, 'type', '${field} has the wrong type');
      continue;
    }
    if (typeof value !== 'string') {
      continue;
    }
    const text = value.trim();
    const { pattern } = field;
    if (pattern && !anchored(pattern.regex).test(text)) {
      fail(field, 'pattern', pattern.messageKey);
    }
    const level = levelOf(field.id);
    if (field.optionSource === 'regions' && level) {
      const active = await isActiveRegionKey(
        schema.country,
        level,
        text,
        parentPathFor(schema, row, level)
      );
      if (!active) {
        fail(field, 'region_invalid', '${field} is not a valid region');
      }
    }
  }

  // 3. Country: the schema selector, required regardless of the record.
  const countryField = fieldById.get('country');
  const countryLabel = countryField
    ? labelOf(countryField)
    : translate('Country');
  const countryValue = row.country;
  if (isBlank(countryValue)) {
    errors.push({
      field: 'country',
      code: 'required',
      message: translate('${field} is required', { field: countryLabel })
    });
  } else if (typeof countryValue !== 'string') {
    errors.push({
      field: 'country',
      code: 'type',
      message: translate('${field} has the wrong type', { field: countryLabel })
    });
  } else {
    const code = countryValue.trim();
    const settings = opts.settings ?? runtime.getSettings();
    const zoneCountries = opts.zoneCountries ?? runtime.getZoneCountries();
    const allowed = isCountryAllowed(
      code.toUpperCase(),
      settings,
      opts.surface ?? 'account',
      zoneCountries
    );
    if (!allowed) {
      errors.push({
        field: 'country',
        code: 'country_not_allowed',
        message: translate('We do not sell to ${country}', { country: code })
      });
    }
  }

  // 4. Registered cross-field rules, in registration order.
  for (const rule of rules.values()) {
    const target = rule.error.field
      ? fieldById.get(rule.error.field)
      : undefined;
    const values = rule.error.field
      ? { field: target ? labelOf(target) : rule.error.field }
      : undefined;
    try {
      const passed = await rule.func(row, schema);
      if (!passed) {
        errors.push({
          field: rule.error.field,
          code: rule.error.code,
          message: translate(rule.error.message, values)
        });
      }
    } catch {
      errors.push({
        field: rule.error.field,
        code: 'rule_error',
        message: `${translate(rule.error.message, values)} (exception occurred)`
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Resolve the schema for `address.country` (the DEFAULT record when empty or
 * unknown) and validate against it. `opts.previous` is the stored row on
 * update and drives the split-name rule; `opts.surface` drives the sell-to
 * check (account and billing use the list, shipping the list ∩ zone countries).
 */
export async function validateAddress(
  address: AddressRow,
  opts: ValidateAddressAgainstSchemaOptions = {}
): Promise<AddressValidationResult> {
  const country = String(address?.country ?? '')
    .trim()
    .toUpperCase();
  const schema = await resolveAddressSchema(country, opts.locale, {
    surface: opts.surface
  });
  return validateAddressAgainstSchema(address, schema, opts);
}

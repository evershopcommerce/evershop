/**
 * The merchant settings filter (specification § 3.13): eight values read from
 * the `setting` table by the server adapter and injected through the runtime.
 * They are a filter over the derived schema, never a mutation of a record, so
 * a change applies on the next request while the registries stay locked.
 *
 * Also home of the small row helpers `derive.ts` shares (grouping fields by
 * row and renumbering rows densely).
 */
import { isAddressColumn } from './tokens.js';
import type {
  AddressColumn,
  AddressSettings,
  AddressSurface,
  ResolvedAddressField,
  ResolvedAddressSchema
} from './types.js';

export const ADDRESS_SETTINGS_DEFAULTS: AddressSettings = Object.freeze({
  nameFormat: 'single',
  telephone: 'required',
  organization: 'optional',
  addressLine2: 'shown',
  addressLine3: 'disabled',
  required: Object.freeze({}),
  defaultCountry: 'store',
  sellToCountries: 'all'
}) as AddressSettings;

type SettingsInput = Partial<Record<keyof AddressSettings, unknown>>;

const INVALID = Symbol('invalid');

function describe(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function warnInvalid(key: keyof AddressSettings, value: unknown, detail?: string): void {
  // eslint-disable-next-line no-console
  console.warn(
    `[address] Invalid value for setting '${key}': ${describe(value)}${
      detail ? ` (${detail})` : ''
    }. Falling back to ${describe(ADDRESS_SETTINGS_DEFAULTS[key])}.`
  );
}

/** A JSON row may arrive unparsed; accept the string form once. */
function parseJsonLike(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return INVALID;
  }
}

function pickEnum<K extends keyof AddressSettings>(
  input: SettingsInput,
  key: K,
  allowed: readonly AddressSettings[K][]
): AddressSettings[K] {
  const value = input[key];
  if (value === undefined || value === null) {
    return ADDRESS_SETTINGS_DEFAULTS[key];
  }
  if (
    typeof value === 'string' &&
    (allowed as readonly unknown[]).includes(value)
  ) {
    return value as AddressSettings[K];
  }
  warnInvalid(key, value);
  return ADDRESS_SETTINGS_DEFAULTS[key];
}

function normalizeRequired(value: unknown): AddressSettings['required'] {
  if (value === undefined || value === null) {
    return {};
  }
  const parsed = parseJsonLike(value);
  if (
    parsed === INVALID ||
    typeof parsed !== 'object' ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    warnInvalid('required', value);
    return {};
  }
  const result: AddressSettings['required'] = {};
  const dropped: string[] = [];
  for (const [field, mode] of Object.entries(parsed as Record<string, unknown>)) {
    if (
      isAddressColumn(field) &&
      (mode === 'asCountry' || mode === 'required')
    ) {
      result[field] = mode;
    } else {
      dropped.push(field);
    }
  }
  if (dropped.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[address] Ignoring unknown entries in setting 'required': ${dropped.join(', ')}.`
    );
  }
  return result;
}

const COUNTRY_CODE = /^[A-Z]{2}$/;

function normalizeSellTo(value: unknown): AddressSettings['sellToCountries'] {
  if (value === undefined || value === null || value === 'all') {
    return 'all';
  }
  const parsed = parseJsonLike(value);
  if (parsed === 'all') {
    return 'all';
  }
  if (parsed === INVALID || !Array.isArray(parsed)) {
    warnInvalid('sellToCountries', value);
    return 'all';
  }
  const codes: string[] = [];
  const junk: unknown[] = [];
  for (const entry of parsed) {
    const code = typeof entry === 'string' ? entry.trim().toUpperCase() : '';
    if (COUNTRY_CODE.test(code)) {
      if (!codes.includes(code)) {
        codes.push(code);
      }
    } else {
      junk.push(entry);
    }
  }
  if (parsed.length > 0 && codes.length === 0) {
    warnInvalid('sellToCountries', value, 'no valid country code');
    return 'all';
  }
  if (junk.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[address] Ignoring invalid entries in setting 'sellToCountries': ${describe(junk)}.`
    );
  }
  return codes;
}

function normalizeDefaultCountry(value: unknown): string {
  if (value === undefined || value === null) {
    return ADDRESS_SETTINGS_DEFAULTS.defaultCountry;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === 'none' || trimmed === 'store') {
      return trimmed;
    }
    const code = trimmed.toUpperCase();
    if (COUNTRY_CODE.test(code)) {
      return code;
    }
  }
  warnInvalid('defaultCountry', value);
  return ADDRESS_SETTINGS_DEFAULTS.defaultCountry;
}

/**
 * Turns raw stored values into a complete `AddressSettings`. Absent values
 * take the code default silently; unknown or malformed values fall back to
 * the default with one `console.warn` per bad value.
 */
export function normalizeAddressSettings(input: SettingsInput): AddressSettings {
  const raw: SettingsInput = input && typeof input === 'object' ? input : {};
  return {
    nameFormat: pickEnum(raw, 'nameFormat', ['single', 'split']),
    telephone: pickEnum(raw, 'telephone', ['required', 'optional', 'hidden']),
    organization: pickEnum(raw, 'organization', ['hidden', 'optional', 'required']),
    addressLine2: pickEnum(raw, 'addressLine2', ['shown', 'hidden']),
    addressLine3: pickEnum(raw, 'addressLine3', ['enabled', 'disabled']),
    required: normalizeRequired(raw.required),
    defaultCountry: normalizeDefaultCountry(raw.defaultCountry),
    sellToCountries: normalizeSellTo(raw.sellToCountries)
  };
}

/* ------------------------------------------------------------------ */
/* Row helpers shared with derive.ts                                   */
/* ------------------------------------------------------------------ */

/** Shallow copy of a field, with its own `pattern` object. */
export function cloneAddressField(field: ResolvedAddressField): ResolvedAddressField {
  const copy: ResolvedAddressField = { ...field };
  if (field.pattern) {
    copy.pattern = { ...field.pattern };
  }
  return copy;
}

/** Copy of a schema that shares nothing mutable with the original. */
export function cloneAddressSchema(schema: ResolvedAddressSchema): ResolvedAddressSchema {
  return {
    ...schema,
    upper: [...schema.upper],
    fields: schema.fields.map(cloneAddressField)
  };
}

/** Fields grouped by row, groups in order of first appearance. */
export function groupFieldsByRow(
  fields: ResolvedAddressField[]
): ResolvedAddressField[][] {
  const groups: ResolvedAddressField[][] = [];
  const indexByRow = new Map<number, number>();
  for (const field of fields) {
    let index = indexByRow.get(field.row);
    if (index === undefined) {
      index = groups.length;
      indexByRow.set(field.row, index);
      groups.push([]);
    }
    groups[index].push(field);
  }
  return groups;
}

/** Flattens row groups back to a field list, numbering rows densely 0..n. */
export function flattenFieldRows(
  groups: ResolvedAddressField[][]
): ResolvedAddressField[] {
  const fields: ResolvedAddressField[] = [];
  let row = 0;
  for (const group of groups) {
    if (group.length === 0) {
      continue;
    }
    for (const field of group) {
      fields.push({ ...field, row });
    }
    row += 1;
  }
  return fields;
}

/* ------------------------------------------------------------------ */
/* The filter                                                          */
/* ------------------------------------------------------------------ */

/**
 * Applies the merchant settings to a derived schema and returns a new one.
 *
 * - `nameFormat: 'split'` replaces `recipient` by `given_name` and
 *   `family_name` on the same row (family first when the record says so).
 * - `telephone` / `organization`: `hidden` removes the field; `required` and
 *   `optional` set its flag. Organization is only touched when the record
 *   shows `%O`.
 * - `addressLine2: 'hidden'` removes lines 2 and 3; `addressLine3: 'enabled'`
 *   adds line 3 after line 2 (not when line 2 is hidden).
 * - `required.<field>: 'required'` tightens only; nothing is ever loosened.
 * - Rows are renumbered densely after removals; `country` stays row 0.
 */
export function applyAddressSettings(
  schema: ResolvedAddressSchema,
  settings: AddressSettings
): ResolvedAddressSchema {
  const s = settings ?? ADDRESS_SETTINGS_DEFAULTS;
  let fields = schema.fields.map(cloneAddressField);
  const find = (id: string) => fields.find((f) => f.id === id);
  const remove = (...ids: string[]) => {
    fields = fields.filter((f) => !ids.includes(f.id));
  };

  if (s.nameFormat === 'split') {
    const index = fields.findIndex((f) => f.id === 'recipient');
    if (index >= 0) {
      const recipient = fields[index];
      const part = (id: 'given_name' | 'family_name'): ResolvedAddressField => ({
        id,
        type: 'text',
        labelType: id,
        required: recipient.required,
        row: recipient.row
      });
      const given = part('given_name');
      const family = part('family_name');
      fields.splice(
        index,
        1,
        ...(schema.nameOrder === 'family_first' ? [family, given] : [given, family])
      );
    }
  }

  const telephone = find('telephone');
  if (telephone) {
    if (s.telephone === 'hidden') {
      remove('telephone');
    } else if (s.telephone === 'optional') {
      telephone.required = false;
    } else if (s.telephone === 'required') {
      telephone.required = true;
    }
  }

  const organization = find('organization');
  if (organization) {
    if (s.organization === 'hidden') {
      remove('organization');
    } else if (s.organization === 'required') {
      organization.required = true;
    } else if (s.organization === 'optional') {
      organization.required = false;
    }
  }

  if (s.addressLine2 === 'hidden') {
    remove('address_line_2', 'address_line_3');
  }

  if (
    s.addressLine3 === 'enabled' &&
    s.addressLine2 !== 'hidden' &&
    !find('address_line_3')
  ) {
    let anchorIndex = fields.findIndex((f) => f.id === 'address_line_2');
    if (anchorIndex < 0) {
      anchorIndex = fields.findIndex((f) => f.id === 'address_line_1');
    }
    if (anchorIndex >= 0) {
      fields.splice(anchorIndex + 1, 0, {
        id: 'address_line_3',
        token: 'A',
        type: 'text',
        labelType: 'address_line_3',
        required: false,
        row: fields[anchorIndex].row
      });
    }
  }

  for (const [field, mode] of Object.entries(s.required ?? {})) {
    if (mode === 'required') {
      const target = find(field as AddressColumn);
      if (target) {
        target.required = true;
      }
    }
  }

  return {
    ...schema,
    upper: [...schema.upper],
    fields: flattenFieldRows(groupFieldsByRow(fields))
  };
}

/* ------------------------------------------------------------------ */
/* Country scope helpers                                               */
/* ------------------------------------------------------------------ */

function normalizeCode(code: string | undefined | null): string {
  return typeof code === 'string' ? code.trim().toUpperCase() : '';
}

/**
 * The country a form opens on: `'none'` → `''` (the DEFAULT record),
 * `'store'` → the store's country (or `''` when unknown), a code → that code.
 */
export function resolveDefaultCountry(
  settings: AddressSettings,
  storeCountry?: string
): string {
  // A store that sells to exactly one country has no choice to offer: that
  // country is the default whatever `defaultCountry` says, so the first
  // schema a new address fetches is already the right one (2026-10-02).
  const sellTo = settings?.sellToCountries;
  if (Array.isArray(sellTo) && sellTo.length === 1) {
    return normalizeCode(sellTo[0]);
  }
  const value = (settings?.defaultCountry ?? ADDRESS_SETTINGS_DEFAULTS.defaultCountry).trim();
  if (value === 'none') {
    return '';
  }
  if (value === 'store') {
    return normalizeCode(storeCountry);
  }
  return value.toUpperCase();
}

function unique(codes: string[]): string[] {
  return [...new Set(codes.map(normalizeCode).filter((c) => c !== ''))];
}

/**
 * The countries a scope offers (§ 3.13 "intent wins"): `ALL` → every country;
 * `SELL_TO` → the merchant's list, or every country for `'all'`; `SHIPPING` →
 * that list ∩ the zone countries, or the list alone when no zone data is known.
 */
export function resolveSellToCountries(
  settings: AddressSettings,
  scope: 'ALL' | 'SELL_TO' | 'SHIPPING',
  allCountries: string[],
  zoneCountries?: string[]
): string[] {
  const all = unique(allCountries ?? []);
  if (scope === 'ALL') {
    return all;
  }
  const sellTo = settings?.sellToCountries ?? 'all';
  const list = sellTo === 'all' ? all : unique(sellTo);
  if (scope === 'SELL_TO' || zoneCountries === undefined) {
    return list;
  }
  const zones = new Set(unique(zoneCountries));
  return list.filter((c) => zones.has(c));
}

/**
 * Whether an address of `country` may be saved on `surface`: account and
 * billing use the sell-to list; shipping uses the list ∩ the zone countries
 * when zone data is known.
 */
export function isCountryAllowed(
  country: string,
  settings: AddressSettings,
  surface: AddressSurface,
  zoneCountries?: string[]
): boolean {
  const cc = normalizeCode(country);
  if (cc === '') {
    return false;
  }
  const sellTo = settings?.sellToCountries ?? 'all';
  if (sellTo !== 'all' && !unique(sellTo).includes(cc)) {
    return false;
  }
  if (surface === 'shipping' && zoneCountries !== undefined) {
    return unique(zoneCountries).includes(cc);
  }
  return true;
}

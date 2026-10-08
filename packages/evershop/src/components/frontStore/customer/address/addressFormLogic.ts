import { formatAddress } from '@evershop/evershop/lib/address/format';
import { splitNameFallback } from '@evershop/evershop/lib/address/names';
import type {
  AddressError,
  AddressToken,
  ResolvedAddressField,
  ResolvedAddressSchema
} from '@evershop/evershop/lib/address/types';
import type { AddressGraphql } from '@evershop/evershop/types/address';

/**
 * The form's pure logic (spec § 3.9), kept free of React and the DOM so it is
 * unit-tested directly: field naming, row grouping, the country-swap clearing
 * rule, initial values from a stored address, the schema-driven re-quote
 * parameters and the shipping-methods gate, and the live preview.
 */

/** `shippingAddress.locality`, or `locality` when the form has no prefix. */
export function fieldName(namePrefix: string, id: string): string {
  return namePrefix ? `${namePrefix}.${id}` : id;
}

/** Fields grouped by `row`, rows in ascending order, fields in schema order. */
export function rowsOf(schema: ResolvedAddressSchema): ResolvedAddressField[][] {
  const rows = new Map<number, ResolvedAddressField[]>();
  for (const field of schema.fields) {
    const row = rows.get(field.row);
    if (row) {
      row.push(field);
    } else {
      rows.set(field.row, [field]);
    }
  }
  return [...rows.entries()].sort(([a], [b]) => a - b).map(([, fields]) => fields);
}

/** What makes a field "the same field" across two countries (spec § 3.9, country swap). */
export function fieldSignature(field: ResolvedAddressField): string {
  return `${field.type}|${field.optionSource ?? ''}|${field.pattern?.regex ?? ''}`;
}

export interface CountrySwapPlan {
  /** Present in both schemas but with a different type, option source or pattern: value cleared. */
  clear: string[];
  /** Present only in the previous schema: value removed from the form. */
  remove: string[];
  /** Present in both with the same signature: value kept. */
  keep: string[];
}

/**
 * Spec § 3.9: on a country change, clear a field when it is absent from the
 * new schema or when its `(type, optionSource, pattern.regex)` differs; keep
 * everything else. An option-sourced field (`regions`) always clears: its
 * option set is parameterised by the country, so a kept key would be another
 * country's region and fail `region_invalid` on save. `country` itself is
 * never touched.
 */
export function countrySwapPlan(
  previous: ResolvedAddressSchema | undefined,
  next: ResolvedAddressSchema
): CountrySwapPlan {
  const plan: CountrySwapPlan = { clear: [], remove: [], keep: [] };
  if (!previous || previous.country === next.country) {
    return plan;
  }
  const nextById = new Map(next.fields.map((f) => [f.id, f]));
  for (const field of previous.fields) {
    if (field.id === 'country') {
      continue;
    }
    const match = nextById.get(field.id);
    if (!match) {
      plan.remove.push(field.id);
    } else if (match.optionSource || fieldSignature(match) !== fieldSignature(field)) {
      plan.clear.push(field.id);
    } else {
      plan.keep.push(field.id);
    }
  }
  return plan;
}

/** The chain of enumerated parents of `field`, outermost first (`dependsOn` links). */
export function parentChain(
  schema: ResolvedAddressSchema,
  field: ResolvedAddressField
): ResolvedAddressField[] {
  const chain: ResolvedAddressField[] = [];
  let current = field;
  const seen = new Set<string>();
  while (current.dependsOn && !seen.has(current.dependsOn)) {
    seen.add(current.dependsOn);
    const parent = schema.fields.find((f) => f.id === current.dependsOn);
    if (!parent) {
      break;
    }
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

/** Every field whose `dependsOn` chain includes `id` (cleared when `id` changes). */
export function dependentsOf(schema: ResolvedAddressSchema, id: string): string[] {
  return schema.fields
    .filter((f) => parentChain(schema, f).some((p) => p.id === id))
    .map((f) => f.id);
}

function text(value: unknown): string {
  return value === undefined || value === null ? '' : String(value);
}

/**
 * Initial form values for a stored address, keyed by field id: columns from
 * the camelCase GraphQL shape (region levels by `key`, the country by code),
 * registered extras from `extra`. In split mode (spec § 3.12 rule 3) a legacy
 * row with `recipient` but no parts pre-fills the two inputs with the labelled
 * lossy split so the customer sees the guess and corrects it.
 */
export function initialValuesFor(
  address: AddressGraphql | null | undefined,
  schema: ResolvedAddressSchema
): Record<string, string> {
  const values: Record<string, string> = {};
  if (!address) {
    return values;
  }
  const columns: Record<string, unknown> = {
    recipient: address.recipient,
    given_name: address.givenName,
    family_name: address.familyName,
    organization: address.organization,
    address_line_1: address.addressLine1,
    address_line_2: address.addressLine2,
    address_line_3: address.addressLine3,
    dependent_locality: address.dependentLocality?.key,
    locality: address.locality?.key,
    administrative_area: address.administrativeArea?.key,
    postal_code: address.postalCode,
    sorting_code: address.sortingCode,
    country: address.country?.code,
    telephone: address.telephone
  };
  const extra = (address.extra ?? {}) as Record<string, unknown>;
  for (const field of schema.fields) {
    const value =
      field.id in columns ? columns[field.id] : extra[field.id];
    if (value !== undefined && value !== null && value !== '') {
      values[field.id] = text(value);
    }
  }
  const split = schema.fields.some((f) => f.id === 'given_name' || f.id === 'family_name');
  if (split && text(address.recipient) && !values.given_name && !values.family_name) {
    const guess = splitNameFallback(text(address.recipient), schema.nameOrder);
    if (guess.givenName) values.given_name = guess.givenName;
    if (guess.familyName) values.family_name = guess.familyName;
  }
  return values;
}

/**
 * What the server's normalization does to a telephone before it validates
 * (`normalizeTelephone` in the customer services), minus the dial-code step
 * the client cannot do: separators (spaces, dots, dashes, parentheses) are
 * removed and an international `00` prefix becomes `+`. The client tests a
 * country's telephone pattern against this form, so "0912 345 678" passes the
 * same regex the server will apply. Anything else is returned trimmed.
 */
export function normalizeTelephoneInput(value: unknown): string {
  const trimmed = text(value).trim();
  if (trimmed === '') {
    return trimmed;
  }
  if (trimmed.startsWith('+')) {
    const rest = trimmed.slice(1);
    return /^[0-9\s().-]+$/.test(rest) ? `+${rest.replace(/[\s().-]/g, '')}` : trimmed;
  }
  if (!/^[0-9\s().-]+$/.test(trimmed)) {
    return trimmed;
  }
  const digits = trimmed.replace(/[\s().-]/g, '');
  return digits.startsWith('00') ? `+${digits.slice(2)}` : digits;
}

/** Tokens whose value changes what a carrier quotes (spec § 3.10): the geographic levels and the postal code. */
export const REQUOTE_TOKENS: readonly AddressToken[] = ['C', 'S', 'Z', 'D'];

const TOKEN_PARAM: Partial<Record<AddressToken, 'locality' | 'administrativeArea' | 'postalCode' | 'dependentLocality'>> = {
  C: 'locality',
  S: 'administrativeArea',
  Z: 'postalCode',
  D: 'dependentLocality'
};

export interface RequoteParams {
  country: string;
  administrativeArea?: string;
  locality?: string;
  dependentLocality?: string;
  postalCode?: string;
}

/**
 * The shipping-quote destination derived from the schema's own geographic
 * tokens plus the country, instead of three hard-coded field names. `null`
 * until a country is chosen. Name, telephone and street lines never appear,
 * so changing them never re-quotes.
 */
export function requoteParamsFor(
  schema: ResolvedAddressSchema | undefined,
  values: Record<string, unknown> | undefined
): RequoteParams | null {
  const country = text(values?.country).trim().toUpperCase();
  if (!schema || country === '') {
    return null;
  }
  const params: RequoteParams = { country };
  for (const field of schema.fields) {
    const param = field.token ? TOKEN_PARAM[field.token] : undefined;
    if (!param) {
      continue;
    }
    const value = text(values?.[field.id]).trim();
    if (value !== '') {
      params[param] = value;
    }
  }
  return params;
}

/** A stable key for "did anything a carrier quotes on change?": sorted entries, so field order never matters. */
export function requoteKey(params: RequoteParams | null): string | null {
  if (!params) {
    return null;
  }
  return JSON.stringify(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== '')
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  );
}

/** The re-quote parameters of a stored (GraphQL-shaped) address, for the "nothing changed yet" baseline. */
export function storedRequoteParams(
  address: AddressGraphql | null | undefined
): RequoteParams | null {
  const country = text(address?.country?.code).trim().toUpperCase();
  if (!address || country === '') {
    return null;
  }
  const params: RequoteParams = { country };
  const entries: [keyof RequoteParams, string][] = [
    ['administrativeArea', text(address.administrativeArea?.key)],
    ['locality', text(address.locality?.key)],
    ['dependentLocality', text(address.dependentLocality?.key)],
    ['postalCode', text(address.postalCode)]
  ];
  for (const [param, value] of entries) {
    if (value.trim() !== '') {
      params[param] = value.trim();
    }
  }
  return params;
}

/** Shipping methods are worth asking for once the country and every REQUIRED geographic field are filled (HK has no postal code). */
export function geographicFieldsReady(
  schema: ResolvedAddressSchema | undefined,
  values: Record<string, unknown> | undefined
): boolean {
  if (!schema || text(values?.country).trim() === '') {
    return false;
  }
  return schema.fields.every(
    (field) =>
      !field.required ||
      !field.token ||
      !REQUOTE_TOKENS.includes(field.token) ||
      text(values?.[field.id]).trim() !== ''
  );
}

/**
 * Live preview lines (spec § 3.6, client side): the same `formatAddress` the
 * server uses, with option labels for selects where known. Country excluded.
 */
export function previewLines(
  schema: ResolvedAddressSchema,
  values: Record<string, unknown> | undefined,
  optionLabels: Record<string, Record<string, string>> = {}
): string[] {
  const byToken: Partial<Record<AddressToken | 'country', string | string[]>> = {};
  const lines: string[] = [];
  for (const field of schema.fields) {
    const raw = text(values?.[field.id]).trim();
    if (raw === '' || !field.token) {
      continue;
    }
    const label = optionLabels[field.id]?.[raw] ?? raw;
    if (field.token === 'A') {
      lines.push(label);
    } else {
      byToken[field.token] = label;
    }
  }
  if (lines.length) {
    byToken.A = lines;
  }
  return formatAddress(byToken, schema.format, { includeCountry: false });
}

/**
 * Field-targeted server errors (spec § 3.8) onto the form: every error with a
 * `field` lands on `<prefix>.<field>`; returns the messages that had no field.
 */
export function serverAddressErrors(
  error: unknown,
  namePrefix: string,
  setError: (name: string, error: { type: string; message: string }) => void
): { applied: number; unassigned: string[] } {
  const errors = (error as { errors?: unknown } | null)?.errors;
  if (!Array.isArray(errors)) {
    return { applied: 0, unassigned: [] };
  }
  let applied = 0;
  const unassigned: string[] = [];
  for (const entry of errors as AddressError[]) {
    if (entry && entry.field) {
      setError(fieldName(namePrefix, entry.field), { type: 'server', message: entry.message });
      applied += 1;
    } else if (entry?.message) {
      unassigned.push(entry.message);
    }
  }
  return { applied, unassigned };
}

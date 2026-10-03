/**
 * Record → schema (specification § 3.4). `deriveAddressSchema` is pure;
 * `resolveAddressSchema` is the pipeline the server and the client call:
 *
 *   format record ─▶ derive(record, locale, levels) ─▶ + extras ─▶ hook ─▶ settings filter
 *
 * Only the first step is cached, keyed `(country, locale, registryGeneration)`;
 * extras, the hook and the settings filter run on every call (pure,
 * microseconds), so a setting change applies on the next request.
 */
import { getAddressExtras } from './extras.js';
import { getAddressFormat, getRegistryGeneration } from './formats.js';
import { getRegionLevels } from './regions.js';
import { getAddressRuntime } from './runtime.js';
import {
  applyAddressSettings,
  cloneAddressSchema,
  flattenFieldRows,
  groupFieldsByRow
} from './settings.js';
import { CORE_TELEPHONE_PATTERN, LEVEL_ORDER } from './tokens.js';
import type {
  AddressFormat,
  AddressLevel,
  AddressSettings,
  AddressSurface,
  AddressToken,
  ExtraFieldDefinition,
  ResolvedAddressField,
  ResolvedAddressSchema
} from './types.js';

/** English source string; `${field}` is interpolated with the field label. */
const INVALID_MESSAGE_KEY = '${field} is not valid';
const TOKEN_LETTERS = 'NOADCSZX';
const ADDRESS_LINE_LABELS = ['address_line', 'address_line_2', 'address_line_3'] as const;

function isToken(letter: string): letter is AddressToken {
  return letter.length === 1 && TOKEN_LETTERS.includes(letter);
}

function baseLanguage(tag: string | undefined | null): string {
  if (typeof tag !== 'string') {
    return '';
  }
  return tag.trim().toLowerCase().split(/[-_]/)[0] ?? '';
}

/**
 * `lfmt` when the record has one that differs from `fmt` and the locale's
 * language is not the language the native layout is written in — the
 * record's `lang`, falling back to `languages[0]`; otherwise `fmt`. Hong
 * Kong lists `en` among its `languages` (an official language) but its
 * native layout is Chinese (`lang: 'zh'`), so an English reader gets the
 * Latin layout, name first; a Chinese reader keeps the native one. A record
 * with neither field always uses `fmt`. The same rule names regions
 * (`regions.ts` displayName). Ruled 2026-10-02.
 */
export function selectFormat(
  record: AddressFormat,
  locale: string
): { format: string; script: 'native' | 'latin' } {
  const fmt = record.fmt ?? '';
  const { lfmt } = record;
  if (lfmt && lfmt !== fmt) {
    const nativeLanguage = baseLanguage(record.lang ?? record.languages?.[0]);
    if (nativeLanguage !== '' && baseLanguage(locale) !== nativeLanguage) {
      return { format: lfmt, script: 'latin' };
    }
  }
  return { format: fmt, script: 'native' };
}

/** Lines of a format (split on `%n`), each as its tokens in order. */
function parseLines(format: string): AddressToken[][] {
  return format.split('%n').map((line) =>
    [...line.matchAll(/%([A-Za-z])/g)]
      .map((m) => m[1])
      .filter(isToken)
  );
}

function parseUpper(upper: string | undefined): AddressToken[] {
  const result: AddressToken[] = [];
  for (const letter of upper ?? '') {
    if (isToken(letter) && !result.includes(letter)) {
      result.push(letter);
    }
  }
  return result;
}

function addressLineCount(record: AddressFormat): 1 | 2 | 3 {
  const n = record.address_lines;
  return n === 1 || n === 2 || n === 3 ? n : 2;
}

function firstExample(zipex: string | undefined): string | undefined {
  const first = (zipex ?? '').split(',')[0]?.trim();
  return first ? first : undefined;
}

function levelField(
  level: AddressLevel,
  token: AddressToken,
  labelType: string,
  required: boolean,
  enumerated: ReadonlySet<AddressLevel>
): ResolvedAddressField {
  const field: ResolvedAddressField = {
    id: level,
    token,
    type: enumerated.has(level) ? 'select' : 'text',
    labelType,
    required,
    row: 0
  };
  if (enumerated.has(level)) {
    field.optionSource = 'regions';
    const outer = LEVEL_ORDER.slice(0, LEVEL_ORDER.indexOf(level))
      .reverse()
      .find((l) => enumerated.has(l));
    if (outer) {
      field.dependsOn = outer;
    }
  }
  return field;
}

function expandToken(
  token: AddressToken,
  record: AddressFormat,
  enumerated: ReadonlySet<AddressLevel>
): ResolvedAddressField[] {
  const required = (record.require ?? '').includes(token);
  switch (token) {
    case 'N':
      // Core rule: an address without a name is undeliverable. Google's
      // `require` never lists N, and § 3.5 / § 3.12 make `recipient` always required.
      return [{ id: 'recipient', token, type: 'text', labelType: 'recipient', required: true, row: 0 }];
    case 'O':
      return [{ id: 'organization', token, type: 'text', labelType: 'organization', required, row: 0 }];
    case 'A': {
      const count = addressLineCount(record);
      const lines: ResolvedAddressField[] = [];
      for (let i = 0; i < count; i += 1) {
        lines.push({
          id: `address_line_${i + 1}`,
          token,
          type: 'text',
          labelType: ADDRESS_LINE_LABELS[i],
          required: i === 0 && required,
          row: 0
        });
      }
      return lines;
    }
    case 'D':
      return [levelField('dependent_locality', token, record.sublocality_name_type ?? 'suburb', required, enumerated)];
    case 'C':
      return [levelField('locality', token, record.locality_name_type ?? 'city', required, enumerated)];
    case 'S':
      return [levelField('administrative_area', token, record.state_name_type ?? 'province', required, enumerated)];
    case 'Z': {
      const field: ResolvedAddressField = {
        id: 'postal_code',
        token,
        type: 'text',
        labelType: record.zip_name_type ?? 'postal',
        required,
        row: 0
      };
      if (record.zip) {
        field.pattern = { regex: `^(?:${record.zip})$`, messageKey: INVALID_MESSAGE_KEY };
      }
      const example = firstExample(record.zipex);
      if (example) {
        field.placeholder = example;
      }
      return [field];
    }
    case 'X':
      return [{ id: 'sorting_code', token, type: 'text', labelType: 'sorting_code', required, row: 0 }];
    default:
      return [];
  }
}

function telephoneField(record: AddressFormat): ResolvedAddressField {
  const field: ResolvedAddressField = {
    id: 'telephone',
    type: 'tel',
    labelType: 'telephone',
    required: true,
    pattern: {
      regex: record.telephone?.pattern ?? CORE_TELEPHONE_PATTERN,
      messageKey: INVALID_MESSAGE_KEY
    },
    row: 0
  };
  if (record.telephone?.example !== undefined) {
    field.placeholder = record.telephone.example;
  }
  return field;
}

function extraField(def: ExtraFieldDefinition): ResolvedAddressField {
  const field: ResolvedAddressField = {
    id: def.id,
    type: def.type,
    labelType: 'extra',
    label: def.label,
    required: def.required ?? false,
    row: 0
  };
  if (def.pattern) {
    field.pattern = { ...def.pattern };
  }
  if (def.placeholder !== undefined) {
    field.placeholder = def.placeholder;
  }
  return field;
}

/**
 * Inserts extras as rows of their own: after the anchor's row (`after`),
 * several extras on one anchor keeping registration order, or at the end
 * when there is no anchor or the anchor is not in the schema. Rows are
 * renumbered densely.
 */
function insertExtras(
  fields: ResolvedAddressField[],
  extras: ExtraFieldDefinition[]
): ResolvedAddressField[] {
  if (extras.length === 0) {
    return fields;
  }
  type RowGroup = { fields: ResolvedAddressField[]; anchor?: string };
  const groups: RowGroup[] = groupFieldsByRow(fields).map((g) => ({ fields: g }));
  for (const def of extras) {
    const anchorIndex = def.after
      ? groups.findIndex((g) => g.fields.some((f) => f.id === def.after))
      : -1;
    if (anchorIndex < 0) {
      groups.push({ fields: [extraField(def)] });
      continue;
    }
    let at = anchorIndex + 1;
    while (at < groups.length && groups[at].anchor === def.after) {
      at += 1;
    }
    groups.splice(at, 0, { fields: [extraField(def)], anchor: def.after });
  }
  return flattenFieldRows(groups.map((g) => g.fields));
}

/**
 * Pure derivation of one country's schema from its record. `country` is
 * carried as given; `regionLevels` are the levels the country's provider
 * enumerates (those become `select` fields with `optionSource: 'regions'`).
 */
export function deriveAddressSchema(input: {
  country: string;
  record: AddressFormat;
  locale: string;
  regionLevels: AddressLevel[];
  extras?: ExtraFieldDefinition[];
}): ResolvedAddressSchema {
  const { country, record, locale, regionLevels } = input;
  const { format, script } = selectFormat(record, locale);
  const enumerated = new Set<AddressLevel>(regionLevels ?? []);

  const groups: ResolvedAddressField[][] = [
    [{ id: 'country', type: 'select', labelType: 'country', required: true, row: 0 }]
  ];
  const seen = new Set<AddressToken>();
  for (const tokens of parseLines(format)) {
    const row: ResolvedAddressField[] = [];
    for (const token of tokens) {
      if (seen.has(token)) {
        continue;
      }
      seen.add(token);
      row.push(...expandToken(token, record, enumerated));
    }
    if (row.length > 0) {
      groups.push(row);
    }
  }

  const recipientRow = groups.findIndex((g) => g.some((f) => f.id === 'recipient'));
  groups.splice(recipientRow >= 0 ? recipientRow + 1 : 1, 0, [telephoneField(record)]);

  return {
    country,
    locale,
    script,
    format,
    nameOrder: record.name_order ?? 'given_first',
    upper: parseUpper(record.upper),
    fields: insertExtras(flattenFieldRows(groups), input.extras ?? [])
  };
}

const derivationCache = new Map<string, ResolvedAddressSchema>();
/** `locale` is request input; the cache must not grow without bound. */
const DERIVATION_CACHE_LIMIT = 4096;

/**
 * The full pipeline for a country. `''` or an unknown code resolves the
 * DEFAULT record (an unknown code is kept as `country`, `''` stays `''`).
 * `locale` defaults to the runtime's; `opts.settings` to the runtime's;
 * `opts.applyHook === false` skips the `addressSchema` hook.
 */
export function resolveAddressSchema(
  country: string,
  locale?: string,
  opts?: {
    surface?: AddressSurface;
    settings?: AddressSettings;
    applyHook?: boolean;
  }
): ResolvedAddressSchema {
  const runtime = getAddressRuntime();
  const cc = typeof country === 'string' ? country.trim().toUpperCase() : '';
  const loc = locale ?? runtime.getLocale() ?? 'en';
  const key = `${cc}|${loc}|${getRegistryGeneration()}`;

  let derived = derivationCache.get(key);
  if (!derived) {
    derived = deriveAddressSchema({
      country: cc,
      record: getAddressFormat(cc),
      locale: loc,
      regionLevels: getRegionLevels(cc)
    });
    if (derivationCache.size >= DERIVATION_CACHE_LIMIT) {
      derivationCache.clear();
    }
    derivationCache.set(key, derived);
  }

  let schema = cloneAddressSchema(derived);
  const extras = getAddressExtras(cc, opts?.surface);
  if (extras.length > 0) {
    schema = { ...schema, fields: insertExtras(schema.fields, extras) };
  }
  if (opts?.applyHook !== false) {
    schema =
      runtime.applyHook(schema, { country: cc, locale: loc, surface: opts?.surface }) ??
      schema;
  }
  return applyAddressSettings(schema, opts?.settings ?? runtime.getSettings());
}

export function __resetDerivationCacheForTests(): void {
  derivationCache.clear();
}

/** Number of cached derivations; lets a test observe hits and misses. */
export function __derivationCacheSizeForTests(): number {
  return derivationCache.size;
}

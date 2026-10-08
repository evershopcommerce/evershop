#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Address-format generator: turns the committed upstream snapshot plus the manual fixes into
 * the TypeScript data under `packages/evershop/src/lib/address/{formats,data}/`.
 *
 *   npm run generate:address-formats                      write the files
 *   node scripts/address-formats/generate.mjs --check     write nothing; exit 1 if anything differs
 *
 * Inputs (all offline; see README.md):
 *   snapshot/google/<CC>.json          one Google libaddressinput record per country; ZZ is DEFAULT
 *   snapshot/google/_root.json         `countries`: every code the dataset knows
 *   snapshot/cldr/<language>.json      CLDR personNames (name order); the root locale is `und`
 *   snapshot/cldr/likelySubtags.json   territory → likely language, for records without `languages`
 *   snapshot/calling-codes.json        { ISO2: "+NN" } from libphonenumber
 *   snapshot/manifest.json             fetch date and pinned versions (the only "timestamp" emitted)
 *   fixes/<CC>.regions.json            replaces the region list of CC entirely (how VN works)
 *   fixes/<CC>.format.json             partial AddressFormat merged over the upstream record
 *   fixes/countries.json               { CC: display name } overriding the country names
 *   snapshot/legacy/locale-lists.json  the former lib/locale/provinces.ts and countries.ts (removed in
 *                                      PR3), every key preserved byte for byte; never edited
 *
 * Outputs: formats/<CC>.ts, formats/DEFAULT.ts, formats/index.ts, data/countries.ts,
 * data/regions.ts. Deterministic: sorted codes, fixed key order, no timestamp other than the
 * snapshot date, so running it twice yields no diff. The append-only rule for region keys is
 * enforced against the previously generated data/regions.ts: a key that would disappear fails
 * the run (carry it as a `retired` entry in fixes/<CC>.regions.json instead).
 *
 * Plain Node >= 20 ESM, no dependencies.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const SNAPSHOT = path.join(HERE, 'snapshot');
const FIXES = path.join(HERE, 'fixes');
const LIB = path.join(ROOT, 'packages', 'evershop', 'src', 'lib');
const OUT = {
  formats: path.join(LIB, 'address', 'formats'),
  data: path.join(LIB, 'address', 'data')
};
const CHECK = process.argv.includes('--check');

/** AddressFormat fields (types.ts), in emission order. */
const FORMAT_FIELDS = [
  'fmt',
  'lfmt',
  'require',
  'upper',
  'zip',
  'zipex',
  'state_name_type',
  'locality_name_type',
  'sublocality_name_type',
  'zip_name_type',
  'languages',
  'lang',
  'address_lines',
  'name_order',
  'telephone'
];
/** Region fields (types.ts), in emission order. */
const REGION_FIELDS = ['key', 'name', 'latinName', 'isoCode', 'retired', 'mergedInto'];

// ---------------------------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------------------------

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const exists = (file) => fs.existsSync(file);
const byCode = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const fail = (message) => {
  throw new Error(message);
};

/** Evaluates the `export const <name> = <literal>;` of a data-only TypeScript file. */
function loadTsLiteral(file, name) {
  const source = fs.readFileSync(file, 'utf8');
  const start = source.indexOf('=', source.indexOf(`export const ${name}`)) + 1;
  const end = source.lastIndexOf(';');
  return new Function(`return (${source.slice(start, end)});`)();
}

/** A string literal quoted the way prettier does: single quotes unless that needs more escapes. */
function str(value) {
  const singles = (value.match(/'/g) || []).length;
  const doubles = (value.match(/"/g) || []).length;
  const quote = singles > doubles ? '"' : "'";
  const body = value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .split(quote)
    .join(`\\${quote}`);
  return quote + body + quote;
}

/** Inline TypeScript literal for a JSON value; `undefined` object fields are skipped. */
function literal(value) {
  if (typeof value === 'string') return str(value);
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return `[${value.map(literal).join(', ')}]`;
  const fields = Object.entries(value).filter(([, v]) => v !== undefined);
  return `{ ${fields.map(([k, v]) => `${k}: ${literal(v)}`).join(', ')} }`;
}

/** Multi-line object body, one field per line in `fields` order, skipping undefined values. */
function block(object, fields) {
  return fields
    .filter((field) => object[field] !== undefined)
    .map((field) => `  ${field}: ${literal(object[field])}`)
    .join(',\n');
}

// ---------------------------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------------------------

const manifest = readJson(path.join(SNAPSHOT, 'manifest.json'));
const SNAPSHOT_DATE = manifest.fetchedAt.slice(0, 10);
const CLDR_VERSION = manifest.sources.cldr.version;
const PHONE_TAG = manifest.sources.libphonenumber.tag;

const callingCodes = readJson(path.join(SNAPSHOT, 'calling-codes.json'));
const likelySubtags = readJson(path.join(SNAPSHOT, 'cldr', 'likelySubtags.json')).supplemental
  .likelySubtags;
const googleCodes = readJson(path.join(SNAPSHOT, 'google', '_root.json'))
  .countries.split('~')
  .sort(byCode);
const google = Object.fromEntries(
  [...googleCodes, 'ZZ'].map((cc) => [cc, readJson(path.join(SNAPSHOT, 'google', `${cc}.json`))])
);
const ZZ = google.ZZ;
// The former lib/locale lists, snapshotted when PR3 removed them: the append-only guard's input.
const legacyLists = readJson(path.join(SNAPSHOT, 'legacy', 'locale-lists.json'));
const localeCountries = legacyLists.countries;

/** fixes/<CC>.regions.json, fixes/<CC>.format.json and fixes/countries.json, validated. `.md` notes are ignored. */
function loadFixes() {
  const fixes = { regions: {}, format: {}, countries: {} };
  if (!exists(FIXES)) return fixes;
  for (const file of fs.readdirSync(FIXES).sort(byCode)) {
    if (file === 'countries.json') {
      fixes.countries = validateCountryFix(readJson(path.join(FIXES, file)));
      continue;
    }
    const match = /^([A-Z]{2})\.(regions|format)\.json$/.exec(file);
    if (!match) {
      if (!file.endsWith('.md')) fail(`fixes/${file}: expected <CC>.regions.json, <CC>.format.json or a .md note`);
      continue;
    }
    const [, cc, kind] = match;
    const data = readJson(path.join(FIXES, file));
    if (kind === 'regions') validateRegionFix(cc, data);
    else validateFormatFix(cc, data);
    fixes[kind][cc] = data;
  }
  return fixes;
}

function validateRegionFix(cc, list) {
  if (!Array.isArray(list)) fail(`fixes/${cc}.regions.json must be an array of Region objects`);
  const active = new Set(list.filter((r) => !r.retired).map((r) => r.key));
  const seen = new Set();
  for (const region of list) {
    const unknown = Object.keys(region).filter((k) => !REGION_FIELDS.includes(k));
    if (unknown.length || typeof region.key !== 'string' || typeof region.name !== 'string') {
      fail(`fixes/${cc}.regions.json: bad entry ${JSON.stringify(region)}`);
    }
    if (seen.has(region.key)) fail(`fixes/${cc}.regions.json: duplicate key ${region.key}`);
    seen.add(region.key);
    if (region.mergedInto !== undefined && !active.has(region.mergedInto)) {
      fail(`fixes/${cc}.regions.json: ${region.key} merges into unknown or retired key ${region.mergedInto}`);
    }
  }
}

function validateFormatFix(cc, patch) {
  const unknown = Object.keys(patch).filter((k) => !FORMAT_FIELDS.includes(k));
  if (unknown.length) fail(`fixes/${cc}.format.json: unknown field(s) ${unknown.join(', ')}`);
}

/** `{ "<CC>": "<display name>" }`; the codes are checked against the country set in buildCountries. */
function validateCountryFix(overrides) {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
    fail('fixes/countries.json must be an object of { "<CC>": "<display name>" }');
  }
  for (const [code, name] of Object.entries(overrides)) {
    if (!/^[A-Z]{2}$/.test(code) || typeof name !== 'string' || !name.trim()) {
      fail(`fixes/countries.json: bad entry ${JSON.stringify({ [code]: name })}`);
    }
  }
  return overrides;
}

// ---------------------------------------------------------------------------------------------
// Format records
// ---------------------------------------------------------------------------------------------

const cldrCache = new Map();
/** CLDR's `personNames.surnameFirst` list for a language; a language with no file falls to `und`. */
function surnameFirstLanguages(language) {
  const locale = exists(path.join(SNAPSHOT, 'cldr', `${language}.json`)) ? language : 'und';
  if (!cldrCache.has(locale)) {
    const json = readJson(path.join(SNAPSHOT, 'cldr', `${locale}.json`));
    cldrCache.set(locale, Object.values(json.main)[0].personNames.surnameFirst || []);
  }
  return cldrCache.get(locale);
}

/**
 * Plan § 1.2: the language is `languages[0]` stripped of script and region (`zh-Hant` → `zh`);
 * a record without `languages` takes CLDR's likely language for the territory (`und-HU` → `hu`),
 * and a territory CLDR does not list takes the default (`und` → `en`). `family_first` when that
 * language is in its own locale file's `surnameFirst` list.
 */
function nameOrder(cc, record) {
  const tag = record.languages
    ? record.languages.split('~')[0]
    : likelySubtags[`und-${cc}`] || likelySubtags.und;
  const language = tag.split('-')[0];
  return surnameFirstLanguages(language).includes(language) ? 'family_first' : 'given_first';
}

/** One AddressFormat from a Google record: ZZ fallbacks, EverShop extensions, then the fix patch. */
function buildFormat(cc, record, patch = {}) {
  const format = {
    fmt: record.fmt ?? ZZ.fmt,
    lfmt: record.lfmt,
    require: record.require ?? ZZ.require,
    upper: record.upper,
    zip: record.zip,
    zipex: record.zipex,
    state_name_type: record.state_name_type,
    locality_name_type: record.locality_name_type,
    sublocality_name_type: record.sublocality_name_type,
    zip_name_type: record.zip_name_type,
    languages: record.languages ? record.languages.split('~') : undefined,
    // Google's `lang` with script and region stripped (`zh-Hant` → `zh`), per types.ts.
    lang: record.lang ? record.lang.split('-')[0] : undefined,
    name_order: nameOrder(cc, record),
    telephone: callingCodes[cc] ? { dialCode: callingCodes[cc] } : undefined
  };
  for (const [field, value] of Object.entries(patch)) format[field] = value === null ? undefined : value;
  if (format.lfmt === format.fmt) format.lfmt = undefined;
  return format;
}

// ---------------------------------------------------------------------------------------------
// Countries and regions
// ---------------------------------------------------------------------------------------------

/** Google's upper-case names, Title Case word by word ("SOUTH SUDAN" → "South Sudan"). */
const titleCase = (name) =>
  name
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/**
 * Google's list ∪ today's lib/locale list. Names: lib/locale where present, else Google's in
 * Title Case; fixes/countries.json overrides either and may name only codes of that set.
 */
function buildCountries(overrides) {
  const localeNames = new Map(localeCountries.map((c) => [c.code, c.name]));
  const codes = [...new Set([...googleCodes, ...localeNames.keys()])].sort(byCode);
  const unknown = Object.keys(overrides).filter((code) => !codes.includes(code));
  if (unknown.length) fail(`fixes/countries.json: unknown country code(s) ${unknown.join(', ')}`);
  const derived = [];
  const list = codes.map((code) => {
    let name = localeNames.get(code);
    if (name === undefined) {
      derived.push(code);
      name = titleCase(google[code].name || code);
    }
    return { code, name: overrides[code] ?? name };
  });
  return { list, derived, overridden: Object.keys(overrides).sort(byCode) };
}

function regionsFromProvinces(rows) {
  const out = {};
  for (const row of rows) {
    (out[row.countryCode] ||= []).push({ key: row.code, name: row.name, isoCode: row.code });
  }
  return out;
}

/** A Latin-script key that reads as a name (a space or a run of 4+ letters), not as a code. */
const isReadableLatinName = (key) =>
  /^[\p{Script=Latin}\p{P}\p{N}\s]+$/u.test(key) &&
  (/\s/.test(key) || /\p{Script=Latin}{4,}/u.test(key));

/**
 * Google's sub-region arrays; `sub_isoids` are ISO 3166-2 suffixes, stored as full codes.
 * `latinName` is `sub_lnames[i]`; without one, a readable key that differs from the native name
 * is itself the Latin name (HK: key 'Kowloon', name '九龍', no sub_lnames). Code-like keys get none.
 */
function regionsFromGoogle(cc, record) {
  const split = (field) => (record[field] ? record[field].split('~') : []);
  const [keys, names, latin, iso] = ['sub_keys', 'sub_names', 'sub_lnames', 'sub_isoids'].map(split);
  return keys.map((key, i) => {
    const name = names[i] || key;
    const latinName = latin[i] || (key !== name && isReadableLatinName(key) ? key : undefined);
    return { key, name, latinName, isoCode: iso[i] ? `${cc}-${iso[i]}` : undefined };
  });
}

/** Fixed field order; `retired: false` and empty optionals are dropped. */
function normalizeRegion(region) {
  const out = {
    key: region.key,
    name: region.name,
    latinName: region.latinName || undefined,
    isoCode: region.isoCode || undefined
  };
  if (region.retired) out.retired = true;
  if (region.mergedInto) out.mergedInto = region.mergedInto;
  return out;
}

/**
 * Per country: the fix file, else the preserved ISO rows, else Google's sub_keys. The preserved
 * rows are the former lib/locale/provinces.ts, read from snapshot/legacy/locale-lists.json so
 * every key that was ever stored stays resolvable (spec § 3.3 rule 2). The previously generated
 * data/regions.ts is the second guard: no key it holds may disappear from the new output.
 */
function buildRegions(fixes) {
  const previousFile = path.join(OUT.data, 'regions.ts');
  const previous = exists(previousFile) ? loadTsLiteral(previousFile, 'DEFAULT_REGIONS') : {};
  const preserved = regionsFromProvinces(legacyLists.provinces);
  const withSubKeys = googleCodes.filter((cc) => google[cc].sub_keys);
  const codes = new Set([...Object.keys(preserved), ...Object.keys(fixes.regions), ...withSubKeys]);
  const regions = {};
  const stats = { fromGoogle: 0, fixed: 0, total: 0 };
  for (const cc of [...codes].sort(byCode)) {
    let list;
    if (fixes.regions[cc]) {
      list = fixes.regions[cc];
      stats.fixed += 1;
    } else if (preserved[cc]) {
      list = preserved[cc];
    } else {
      list = regionsFromGoogle(cc, google[cc]);
      stats.fromGoogle += list.length;
    }
    list = list.map(normalizeRegion).sort((a, b) => byCode(a.key, b.key));
    if (new Set(list.map((r) => r.key)).size !== list.length) fail(`${cc}: duplicate region keys`);
    if (list.length) regions[cc] = list;
    stats.total += list.length;
  }
  const lost = [];
  for (const [cc, old] of Object.entries(previous)) {
    const keys = new Set((regions[cc] || []).map((r) => r.key));
    for (const region of old) if (!keys.has(region.key)) lost.push(`${cc}:${region.key}`);
  }
  if (lost.length) {
    fail(
      `append-only rule: ${lost.length} region key(s) would disappear from data/regions.ts. ` +
        `Carry them as retired entries in fixes/<CC>.regions.json: ${lost.join(' ')}`
    );
  }
  return { regions, stats };
}

// ---------------------------------------------------------------------------------------------
// File rendering
// ---------------------------------------------------------------------------------------------

const GENERATED_LINE =
  'GENERATED FILE — do not edit by hand. Regenerate with `npm run generate:address-formats`.';

/** Plan § 1.5, verbatim. */
const HEADER = `/**
 * ${GENERATED_LINE}
 *
 * Address format data derived from Google's libaddressinput address metadata
 * (https://github.com/google/libaddressinput, served at
 * https://chromium-i18n.appspot.com/ssl-address/data), licensed under the
 * Creative Commons Attribution 4.0 International License (CC-BY 4.0,
 * https://creativecommons.org/licenses/by/4.0/). Changes made: converted from JSON to
 * TypeScript, keys normalized to EverShop's AddressFormat shape, manual corrections from
 * scripts/address-formats/fixes/ applied, EverShop extensions (address_lines, name_order,
 * telephone.dialCode) added. Snapshot: ${SNAPSHOT_DATE}.
 */
`;

const CLDR_HEADER = `/**
 * Person-name order derived from Unicode CLDR ${CLDR_VERSION} person-name data
 * (https://cldr.unicode.org), © Unicode, Inc., used under the Unicode License v3
 * (https://www.unicode.org/license.txt).
 */
`;

const PHONE_HEADER = `/* telephone.dialCode from Google's libphonenumber ${PHONE_TAG} (https://github.com/google/libphonenumber), Apache License 2.0. */
`;

const REGIONS_NOTE = `/**
 * Keys are what gets stored (customer addresses, orders, shipping zones, tax rates, the store
 * address), so they are append-only: a refresh may add keys and may retire them (\`retired: true\`,
 * \`mergedInto\` naming the successor) but never removes or renames one; the generator fails if it
 * would. ISO 3166-2 countries keep their codes as keys (US-CA); countries Google keys by name keep
 * those names (Kowloon). \`isoCode\` is the full ISO 3166-2 code where one is known.
 *
 * Vietnam (spec § 10 Q6, scripts/address-formats/fixes/VN.regions.json): the 34 post-2025
 * provinces are the active list; each keeps the ISO 3166-2 code of its name-bearing constituent
 * (VN-07 Tuyên Quang, VN-SG Hồ Chí Minh) because ISO has published no post-merger codes; the 29
 * absorbed codes are retired with \`mergedInto\`. VN-26 displays the current official name "Huế".
 */
`;

function formatFile(format) {
  const header = HEADER + CLDR_HEADER + (format.telephone?.dialCode ? PHONE_HEADER : '');
  return `${header}import type { AddressFormat } from '../types.js';

export default {
${block(format, FORMAT_FIELDS)}
} satisfies AddressFormat;
`;
}

function indexFile(codes) {
  const modules = [...codes, 'DEFAULT'].sort((a, b) => byCode(`./${a}.js`, `./${b}.js`));
  return `${HEADER}${CLDR_HEADER}import type { AddressFormat } from '../types.js';
${modules.map((m) => `import ${m} from './${m}.js';`).join('\n')}

/** One record per country of the snapshot, keyed by ISO 3166-1 alpha-2 code, sorted. */
export const ADDRESS_FORMATS: Record<string, AddressFormat> = {
${codes.map((cc) => `  ${cc}`).join(',\n')}
};

/** Google's \`ZZ\` record: what an unknown or missing country code resolves to. */
export const DEFAULT_ADDRESS_FORMAT: AddressFormat = DEFAULT;
`;
}

function countriesFile(list) {
  return `${HEADER}import type { Country } from '../types.js';

/** Every country the registry knows (Google's list ∪ lib/locale's), English names, sorted by code. */
export const COUNTRIES: Country[] = [
${list.map((country) => `  ${literal(country)}`).join(',\n')}
];
`;
}

function regionsFile(regions) {
  const body = Object.entries(regions)
    .map(([cc, list]) => `  ${cc}: [\n${list.map((r) => `    ${literal(r)}`).join(',\n')}\n  ]`)
    .join(',\n');
  return `${HEADER}${REGIONS_NOTE}import type { Region } from '../types.js';

/** Default region data: country code → administrative areas, sorted by key. */
export const DEFAULT_REGIONS: Record<string, Region[]> = {
${body}
};
`;
}

/** Writes changed files, removes stale generated ones; in --check mode only reports them. */
function emit(files) {
  const stale = [];
  for (const dir of Object.values(OUT)) {
    if (!exists(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      const file = path.join(dir, name);
      if (files.has(file) || !name.endsWith('.ts')) continue;
      if (fs.readFileSync(file, 'utf8').includes(GENERATED_LINE)) stale.push(file);
    }
  }
  const changed = [];
  for (const [file, content] of files) {
    if (exists(file) && fs.readFileSync(file, 'utf8') === content) continue;
    changed.push(file);
    if (CHECK) continue;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  if (!CHECK) for (const file of stale) fs.unlinkSync(file);
  return { changed, stale };
}

// ---------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------

function main() {
  const fixes = loadFixes();
  const files = new Map();
  const familyFirst = [];
  for (const cc of [...googleCodes, 'ZZ']) {
    const format = buildFormat(cc, google[cc], fixes.format[cc]);
    if (format.name_order === 'family_first' && cc !== 'ZZ') familyFirst.push(cc);
    files.set(path.join(OUT.formats, `${cc === 'ZZ' ? 'DEFAULT' : cc}.ts`), formatFile(format));
  }
  files.set(path.join(OUT.formats, 'index.ts'), indexFile(googleCodes));
  const countries = buildCountries(fixes.countries);
  files.set(path.join(OUT.data, 'countries.ts'), countriesFile(countries.list));
  const { regions, stats } = buildRegions(fixes);
  files.set(path.join(OUT.data, 'regions.ts'), regionsFile(regions));

  const { changed, stale } = emit(files);
  const rel = (file) => path.relative(ROOT, file);
  console.log(`snapshot ${SNAPSHOT_DATE}; CLDR ${CLDR_VERSION}; libphonenumber ${PHONE_TAG}`);
  console.log(`formats: ${googleCodes.length} countries + DEFAULT; family_first: ${familyFirst.join(' ')}`);
  console.log(
    `countries: ${countries.list.length} (${countries.derived.length} without a lib/locale name: ` +
      `${countries.derived.join(' ')}; ${countries.overridden.length} named by fixes/countries.json: ` +
      `${countries.overridden.join(' ')})`
  );
  console.log(
    `regions: ${stats.total} keys in ${Object.keys(regions).length} countries ` +
      `(${stats.fromGoogle} from Google sub_keys; ${stats.fixed} countries from fixes/)`
  );
  if (CHECK) {
    for (const file of changed) console.error(`out of date: ${rel(file)}`);
    for (const file of stale) console.error(`stale: ${rel(file)}`);
    if (changed.length || stale.length) process.exit(1);
    console.log('check: generated files are up to date');
  } else {
    console.log(`wrote ${changed.length} file(s); removed ${stale.length} stale file(s)`);
  }
}

try {
  main();
} catch (error) {
  console.error(`generate.mjs: ${error.message}`);
  process.exit(1);
}

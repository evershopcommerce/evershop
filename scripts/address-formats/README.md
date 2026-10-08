# Address-format data snapshot

## What this folder is

On-demand, **maintainer-only** tooling for the address-format registry
(`specifications/11-address-format-registry-specification.md` § 3.2–3.3 and § 4;
`specifications/11-address-format-registry-implementation-plan.md` § 1.1–1.5). Nothing in
this folder is part of `npm run build`, `npm install`, the dev server or runtime, and none of
it is published: the `@evershop/evershop` package is built from `packages/evershop/`, and
`scripts/` lives outside that tree.

| Path | What it is |
|---|---|
| `fetch-snapshot.mjs` | Downloads the raw upstream data (plain Node >= 20, no dependencies). |
| `snapshot/` | The committed raw data the generator consumes (see "Sources" below). |
| `snapshot/manifest.json` | Fetch date, source URLs, pinned versions, counts and a sha256 per file. |
| `generate.mjs` | Turns `snapshot/` + `fixes/` into TypeScript under `packages/evershop/src/lib/address/formats/` and `lib/address/data/` (see "Generator" below). |
| `fixes/` | Manual corrections the generator applies on top of the snapshot: `<CC>.regions.json`, `<CC>.format.json`, `<CC>.sources.md` (see "Generator" below). |

The snapshot is committed so that a refresh is a reviewable diff of input and output side by
side, the generator runs offline, and CI can check that regenerating from the committed
snapshot reproduces the committed TypeScript (spec § 4, "Refresh discipline").

## Sources and licences

### 1. Google libaddressinput address metadata — CC-BY 4.0

- Root record: `https://chromium-i18n.appspot.com/ssl-address/data` → `snapshot/google/_root.json`.
  Its `countries` field is a `~`-separated list of every country code the dataset knows.
- One record per country: `…/data/<CC>` → `snapshot/google/<CC>.json`, plus `ZZ` (the
  `DEFAULT` record used for unknown countries). The appspot URL answers `302` to
  `https://www.gstatic.com/chrome/autofill/libaddressinput/chromium-i18n/ssl-address/data/<CC>`;
  both URLs are recorded in the manifest.
- Sub-region records (`…/data/<CC>/<key>`) are **not** fetched. The parent record already
  carries `sub_keys`, `sub_names`, `sub_lnames`, `sub_isoids` and `sub_zips`, which is all v1
  needs (plan D-18: deeper levels are not imported).
- Licence: the repository README (`https://github.com/google/libaddressinput#license`) states
  "Source code licensed under the Apache 2.0. Data licensed under the CC-BY 4.0". Only the data
  is taken, under CC-BY 4.0 (`https://creativecommons.org/licenses/by/4.0/`), with the
  attribution header below.

### 2. Unicode CLDR person-name data — Unicode License v3

- Source: the `cldr-json` distribution on npm, package `cldr-person-names-full`, file
  `main/<locale>/personNames.json`, fetched from `https://cdn.jsdelivr.net/npm/`. The version
  is pinned in `snapshot/manifest.json` (`sources.cldr.version`); every file in `snapshot/cldr/`
  comes from that one version.
- What is fetched: the `personNames.json` of every language the generator's `name_order` rule
  can look up (the same rule is mirrored in `fetch-snapshot.mjs`): the language subtag of
  `languages[0]` with script and region stripped (`zh-Hant` → `zh`) for records that carry
  `languages`, the language subtag of `likelySubtags["und-<CC>"]` (default `und` → `en`) for
  records that do not, plus the root locale `und`. A language with no CLDR file is listed under
  `sources.cldr.missingLocales` in the manifest (never guessed or mapped to a parent locale
  here; the generator falls back to `und`); `sources.cldr.localeCount` is the number saved.
- Also fetched, from the same pinned `cldr-json` release: package `cldr-core`, file
  `supplemental/likelySubtags.json` → `snapshot/cldr/likelySubtags.json` (manifest:
  `sources.cldr.likelySubtags`). It maps a territory to its likely language (`und-HU` →
  `hu-Latn-HU`), the name-order fallback for Google records that carry no `languages` field.
  Territories whose likely language is the default have no `und-<CC>` entry (`und-US` is
  absent; `und` itself resolves to `en-Latn-US`). Same Unicode License v3.
- Shape notes: `cldr-json` publishes CLDR `root` as the locale **`und`** (there is no
  `main/root/`). The name-order lists are `personNames.givenFirst` and
  `personNames.surnameFirst` (the XML's `<nameOrderLocales order="…">` flattened), not a
  `nameOrderLocales` object.
- Licence: Unicode License v3, `https://www.unicode.org/license.txt`.

### 3. libphonenumber — Apache 2.0 (country calling codes only)

- Source: `https://github.com/google/libphonenumber`, file `resources/PhoneNumberMetadata.xml`
  at the latest release tag (resolved through the GitHub releases API and recorded in the
  manifest as `sources.libphonenumber.tag`).
- What is taken: every `<territory id="XX" countryCode="NN">` pair with a two-letter `id`,
  saved as `snapshot/calling-codes.json` (`{ "<ISO2>": "+NN" }`, sorted by key). The XML itself
  is **not** saved and **no number patterns** are bundled — numbering plans churn, so patterns
  come from packages (spec § 3.2). Non-geographic territories (`id="001"`: +800, +870, …) are
  skipped and counted in the manifest.
- Licence: Apache 2.0.

## Refresh procedure

1. Run the fetcher (needs network; about 300 small GET requests at concurrency 4):

   ```bash
   node scripts/address-formats/fetch-snapshot.mjs
   # optional: CLDR_VERSION=48.2.0 to pin a CLDR version instead of npm "latest"
   # optional: GITHUB_TOKEN=… if the unauthenticated GitHub API rate limit bites
   ```

   The script is idempotent: files are pretty-printed with sorted keys, so an unchanged
   upstream yields a byte-identical file; only `fetchedAt` in the manifest moves. Files that
   upstream no longer serves are deleted (never when any fetch failed — a partial run exits
   non-zero and prunes nothing).

2. Review the snapshot diff before anything else:

   ```bash
   git diff --stat -- scripts/address-formats/snapshot
   git diff -- scripts/address-formats/snapshot/manifest.json
   ```

   Look for: a new CLDR version or libphonenumber tag, countries added or removed from the
   Google root list, new `missingLocales`, records that lost `fmt`, and sub-region key changes
   (renames and removals — see the append-only rule below).

3. Run the generator — `npm run generate:address-formats` → `scripts/address-formats/generate.mjs`.
   It runs offline from the committed snapshot, applies `fixes/`, and fails if a region key
   would disappear or be renamed (see "Generator" below). CI re-runs it with `--check` and
   requires a zero diff.

4. Review the generated TypeScript diff next to the snapshot diff and commit both together.

## Generator

`npm run generate:address-formats` runs `generate.mjs`: plain Node >= 20 ESM, no dependencies,
offline. `node scripts/address-formats/generate.mjs --check` writes nothing and exits 1 when a
generated file is out of date or stale; that is the CI check.

### What it writes

| Output | Content |
|---|---|
| `packages/evershop/src/lib/address/formats/<CC>.ts` | One `AddressFormat` per country of the Google root list, as `export default { … } satisfies AddressFormat`. `fmt` and `require` fall back to `ZZ`'s when the record has none; `lfmt` is dropped when it equals `fmt` (AE AM EG RU UA VN); `languages` is split on `~`; `lang` is Google's `lang` with script and region stripped (`zh` for HK and TW), placed right after `languages`; `name_order` and `telephone.dialCode` are added; `address_lines` is never emitted (the library defaults it); fields the record lacks are omitted, never written as `undefined`. |
| `formats/DEFAULT.ts` | Google's `ZZ` record. |
| `formats/index.ts` | `ADDRESS_FORMATS` (every country, sorted by code) and `DEFAULT_ADDRESS_FORMAT`. |
| `data/countries.ts` | `COUNTRIES`: Google's list ∪ the former `lib/locale/countries.ts` (now `snapshot/legacy/locale-lists.json`), sorted by code. English names from that snapshot where present, else Google's upper-case name in Title Case word by word; `fixes/countries.json` then overrides either (today it names AC BQ CW SS SX TA XK, the codes with no `lib/locale` name). |
| `data/regions.ts` | `DEFAULT_REGIONS`: country code → `Region[]`, sorted by country then by key. |

Region sources, per country, first match wins:

1. `fixes/<CC>.regions.json` (VN today).
2. The preserved ISO 3166-2 rows: the former `lib/locale/provinces.ts`, kept verbatim in `snapshot/legacy/locale-lists.json` since PR3 removed the file, each row as
   `{ key: code, name, isoCode: code }` with key and name byte for byte. Once plan PR3 removes
   that file, the previously generated `data/regions.ts` carries every key and takes its place.
3. Google's `sub_keys` / `sub_names` / `sub_lnames` / `sub_isoids` for countries neither source
   covers (HK and KY today). Keys are Google's `sub_keys` as is; `name` is `sub_names[i]`, else
   the key; `isoCode` is the full `CC-<sub_isoid>` code when one is given. `latinName` is
   `sub_lnames[i]`; without one, a key that differs from the name and reads as a Latin-script
   name rather than a code (a space or a run of 4+ letters: 'Hong Kong Island', 'Kowloon') is
   itself the Latin name, because Google keys some countries by the English name and names them
   natively (HK: key 'Kowloon', name '九龍', no `sub_lnames`). Code-like keys get none, and so do
   keys equal to their name (KY).

`retired: false` is never written; `retired` and `mergedInto` appear only when true / present.

### Fix files

- `fixes/<CC>.regions.json` — an array of `Region` objects that **replaces** CC's region list
  entirely. Under the append-only rule it must carry every key the previous `data/regions.ts`
  had for CC, absorbed ones as `retired: true` with `mergedInto` naming an active key of the
  same list. Validated: `key` and `name` are strings, keys are unique, no field outside the
  `Region` type, every `mergedInto` resolves to an active key.
- `fixes/<CC>.format.json` — a partial `AddressFormat` (the field names of `types.ts`) merged
  field by field over the normalized upstream record, after the `name_order` / `telephone`
  derivation, so it can override those too; a `null` value removes a field. Unknown fields fail
  the run. None exists yet.
- `fixes/countries.json` — `{ "<CC>": "<display name>" }`, applied after the `lib/locale` and
  Google-derived names. Every code must exist in the country set (Google's list ∪ `lib/locale`'s)
  or the run fails. Today it names the seven codes that have no `lib/locale` name: AC BQ CW SS SX
  TA XK ("Curaçao", "Tristan da Cunha", …).
- `fixes/<CC>.sources.md` — provenance notes, ignored by the generator. Any other file name in
  `fixes/` fails the run.

### `name_order` (plan § 1.2)

1. Language = `languages[0]` with script and region stripped (`zh-Hant` → `zh`).
2. A record with no `languages` field (190 of 252) takes CLDR's likely language for the
   territory from `likelySubtags` (`und-HU` → `hu`, `und-MO` → `zh`); a territory CLDR does not
   list takes the default (`und` → `en`, as for US).
3. Look up `snapshot/cldr/<language>.json`, falling back to `und.json` when there is no such
   file (`pau`).
4. `family_first` when the language appears in that file's `personNames.surnameFirst` list, else
   `given_first`.

Result for the 2026-10-02 snapshot: CN HK HU JP KH KP KR LK MN MO TW VN. The fetcher downloads
every language this rule can reach (the `languages[0]` bases plus the `likelySubtags`-derived
languages), so HU resolves through its own `hu.json`; KH (`km`) and LK (`si`) come out
`family_first` the same way because their CLDR files list them under `surnameFirst`. Four
reachable languages have no CLDR file in 48.2.0 and fall back to `und`: `bi`, `pau`, `sm`,
`tkl` (`sources.cldr.missingLocales` in the manifest).

### Idempotence and the key guard

Output is deterministic (sorted codes, fixed field order, prettier-style quoting, the snapshot
date from `manifest.json` as the only date), so a second run writes nothing: verify with
`--check`, or with `git status` after running twice. Before writing `data/regions.ts` the
generator loads the previous one and fails if any key would disappear; the fix is a `retired`
entry in `fixes/<CC>.regions.json`, never deleting the key. Generated files the current snapshot
no longer produces (a country dropped upstream) are deleted in write mode and reported in
`--check` mode.

## The append-only rule for region keys

Region keys are what gets stored: in customer addresses, in orders (legacy orders keep their
keys forever), in shipping zones (`shipping_zone_region`), in tax rates
(`tax_rate.administrative_area`) and in the store address setting. `resolveRegionName` must be
able to name every key that was ever valid, so (spec § 3.3, rule 2; § 4):

- A refresh may **add** keys.
- A refresh may **retire** keys (`retired: true`, with `mergedInto` pointing at the successor
  when there is one). Retired keys are hidden from selection but still resolve by name.
- A refresh may **never remove or rename** a key. The generator fails if regenerating would
  make a key disappear or change its spelling; the fix is to carry the old key as a retired
  entry, never to delete it.

The rule is enforced by the generator against the previously generated data, not against this
snapshot: the raw snapshot is upstream's current truth and may well lose or rename a key
between two fetches (Google's `VN` record, for instance, already lists `Thành phố Huế`).
Retired keys referenced by merchant data are never remapped automatically; the admin
`addressConfigWarnings` query flags them for the merchant (spec § 3.3).

## Attribution header for generated files

Every file under `packages/evershop/src/lib/address/formats/` and `lib/address/data/` opens
with the following header (generator-emitted, do not hand-edit); the text is plan § 1.5
verbatim:

```ts
/**
 * GENERATED FILE — do not edit by hand. Regenerate with `npm run generate:address-formats`.
 *
 * Address format data derived from Google's libaddressinput address metadata
 * (https://github.com/google/libaddressinput, served at
 * https://chromium-i18n.appspot.com/ssl-address/data), licensed under the
 * Creative Commons Attribution 4.0 International License (CC-BY 4.0,
 * https://creativecommons.org/licenses/by/4.0/). Changes made: converted from JSON to
 * TypeScript, keys normalized to EverShop's AddressFormat shape, manual corrections from
 * scripts/address-formats/fixes/ applied, EverShop extensions (address_lines, name_order,
 * telephone.dialCode) added. Snapshot: <YYYY-MM-DD>.
 */
```

Files that also carry CLDR-derived values (`name_order`) add:

```ts
/**
 * Person-name order derived from Unicode CLDR <version> person-name data
 * (https://cldr.unicode.org), © Unicode, Inc., used under the Unicode License v3
 * (https://www.unicode.org/license.txt).
 */
```

`dialCode` values add one line naming the libphonenumber release (Apache 2.0).
`packages/evershop/NOTICE` repeats all three notices and is added to `package.json` `files`
(today `["dist","src",".swcrc"]`).

The `<YYYY-MM-DD>` and `<version>` placeholders are filled from `snapshot/manifest.json`
(`fetchedAt`, `sources.cldr.version`, `sources.libphonenumber.tag`).

#!/usr/bin/env node
/* eslint-disable no-console -- this is a CLI; its report IS console output */
/**
 * Address-format snapshot fetcher — pre-work § 1.1–1.3 of
 * specifications/11-address-format-registry-implementation-plan.md. Details in README.md.
 *
 *   node scripts/address-formats/fetch-snapshot.mjs
 *
 * Writes the raw upstream data the address-format generator consumes, pretty-printed with
 * sorted keys, under scripts/address-formats/snapshot/: google/<CC>.json (libaddressinput,
 * CC-BY 4.0), cldr/<locale>.json + cldr/likelySubtags.json (CLDR, Unicode License v3),
 * calling-codes.json (libphonenumber, Apache 2.0) and manifest.json (date, sources, versions,
 * sha256 per file).
 *
 * Maintainer-only, on demand, never part of build/install/runtime. Idempotent: a re-run
 * overwrites the snapshot and deletes files upstream no longer has. Node >= 20, no deps.
 * Optional env: CLDR_VERSION (pin instead of npm "latest"), GITHUB_TOKEN (API rate limit).
 */
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');
const OUT = path.join(HERE, 'snapshot');
const CONCURRENCY = 4;
const RETRIES = 3;

const GOOGLE_URL = 'https://chromium-i18n.appspot.com/ssl-address/data';
// The former lib/locale/countries.ts, snapshotted when PR3 removed it (see generate.mjs).
const FALLBACK_COUNTRIES = path.join(REPO_ROOT, 'scripts/address-formats/snapshot/legacy/locale-lists.json');
const CLDR_PACKAGE = 'cldr-person-names-full';
const CLDR_ROOT_LOCALE = 'und'; // cldr-json publishes CLDR "root" as the "und" locale
const cldrUrl = (version, locale) =>
  `https://cdn.jsdelivr.net/npm/${CLDR_PACKAGE}@${version}/main/${locale}/personNames.json`;
const CLDR_CORE_PACKAGE = 'cldr-core'; // same cldr-json release as CLDR_PACKAGE
const likelySubtagsUrl = (version) =>
  `https://cdn.jsdelivr.net/npm/${CLDR_CORE_PACKAGE}@${version}/supplemental/likelySubtags.json`;
const LIBPHONENUMBER_RELEASE =
  'https://api.github.com/repos/google/libphonenumber/releases/latest';
const libphonenumberXml = (tag) =>
  `https://raw.githubusercontent.com/google/libphonenumber/${tag}/resources/PhoneNumberMetadata.xml`;

// ------------------------------------------------------------------ helpers

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const written = new Set(); // relative paths written this run: manifest + stale cleanup

/** GET with retries (network errors, 429, 5xx) and exponential backoff. A 404 is returned,
 *  not thrown, so callers can tell "missing upstream" from "broken upstream". */
async function fetchText(url, headers = {}) {
  let lastError;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt > 0) await sleep(500 * 2 ** (attempt - 1));
    try {
      const res = await fetch(url, { headers, redirect: 'follow' });
      if (res.ok || res.status === 404) {
        return { status: res.status, text: await res.text(), url: res.url };
      }
      lastError = new Error(`HTTP ${res.status} for ${url}`);
      if (res.status !== 429 && res.status < 500) break; // not retryable
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function fetchJson(url, headers) {
  const { status, text } = await fetchText(url, headers);
  if (status === 404) throw new Error(`HTTP 404 for ${url}`);
  return JSON.parse(text);
}

/** Recursively sort object keys so unchanged upstream data yields a byte-identical file. */
function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((k) => [k, sortKeys(value[k])]));
}

async function writeJson(relPath, data) {
  const file = path.join(OUT, relPath);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(sortKeys(data), null, 2)}\n`);
  written.add(relPath);
}

/** Run `fn` over `items` with at most `limit` requests in flight. */
async function mapLimit(items, limit, fn) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await fn(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

// ------------------------------------------------------------------ 1.1 Google libaddressinput

async function fetchGoogle() {
  const root = await fetchJson(GOOGLE_URL);
  await writeJson('google/_root.json', root);
  let countrySource = 'root record "countries" field';
  let codes = String(root.countries ?? '').split('~').filter(Boolean);
  if (codes.length === 0) {
    const legacy = JSON.parse(await readFile(FALLBACK_COUNTRIES, 'utf8'));
    codes = legacy.countries.map((country) => country.code);
    countrySource = `fallback: ${path.relative(REPO_ROOT, FALLBACK_COUNTRIES)}`;
    console.warn(`! root record has no "countries" field; ${countrySource}`);
  }
  codes = [...new Set([...codes, 'ZZ'])].sort();

  const records = {};
  const failures = [];
  let finalUrlTemplate = null;
  await mapLimit(codes, CONCURRENCY, async (code) => {
    const url = `${GOOGLE_URL}/${code}`;
    try {
      const res = await fetchText(url);
      if (res.status === 404) throw new Error(`HTTP 404 for ${url}`);
      finalUrlTemplate ??= res.url.replace(/\/[A-Z]{2}$/, '/<CC>');
      records[code] = JSON.parse(res.text);
      await writeJson(`google/${code}.json`, records[code]);
    } catch (err) {
      failures.push({ code, error: err.message });
    }
  });
  console.log(`Google: ${Object.keys(records).length}/${codes.length} records`);
  const manifest = {
    url: GOOGLE_URL,
    recordUrlTemplate: `${GOOGLE_URL}/<CC>`,
    finalUrlTemplate, // the appspot URL 302s to www.gstatic.com; kept for the audit trail
    licence: 'CC-BY 4.0 (data) — https://github.com/google/libaddressinput#license',
    rootId: root.id ?? null,
    rootKey: root.key ?? null,
    countrySource,
    recordCount: codes.length, // every root-listed country + ZZ (the DEFAULT record)
    failures
  };
  return { manifest, records };
}

// ------------------------------------------------------------------ 1.2 CLDR person-name order

async function fetchCldr(records) {
  const version =
    process.env.CLDR_VERSION ||
    (await fetchJson(`https://registry.npmjs.org/${CLDR_PACKAGE}/latest`)).version;
  // Likely language per territory ("und-HU" → "hu-Latn-HU"): the name-order source for the
  // Google records that carry no `languages` field. Same cldr-json release, other package.
  const likelyUrl = likelySubtagsUrl(version);
  const likely = await fetchJson(likelyUrl);
  await writeJson('cldr/likelySubtags.json', likely);
  const likelySubtags = likely.supplemental.likelySubtags;
  // Locale set = the generator's reading rule (generate.mjs nameOrder): the language subtag of
  // languages[0] (script/region stripped), else of likelySubtags["und-<CC>"] (default "und").
  const wanted = new Set([CLDR_ROOT_LOCALE]);
  for (const [code, record] of Object.entries(records)) {
    const tag = record.languages
      ? String(record.languages).split('~')[0]
      : likelySubtags[`und-${code}`] || likelySubtags.und;
    wanted.add(tag.split('-')[0]);
  }
  const missingLocales = [];
  await mapLimit([...wanted].sort(), CONCURRENCY, async (locale) => {
    const res = await fetchText(cldrUrl(version, locale));
    if (res.status === 404) missingLocales.push(locale);
    else await writeJson(`cldr/${locale}.json`, JSON.parse(res.text));
  });
  missingLocales.sort();
  const locales = [...wanted].filter((l) => !missingLocales.includes(l)).sort();
  console.log(
    `CLDR ${CLDR_PACKAGE}@${version}: ${locales.length}/${wanted.size} locales + likelySubtags`
  );
  return {
    package: CLDR_PACKAGE,
    version,
    urlTemplate: cldrUrl(version, '<locale>'),
    rootLocale: CLDR_ROOT_LOCALE,
    licence: 'Unicode License v3 — https://www.unicode.org/license.txt',
    localeCount: locales.length,
    locales,
    missingLocales,
    likelySubtags: {
      package: CLDR_CORE_PACKAGE,
      version,
      url: likelyUrl,
      file: 'cldr/likelySubtags.json'
    }
  };
}

// ------------------------------------------------------------------ 1.3 Calling codes

async function fetchCallingCodes() {
  const headers = { Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const tag = (await fetchJson(LIBPHONENUMBER_RELEASE, headers)).tag_name;
  const url = libphonenumberXml(tag);
  const { status, text: xml } = await fetchText(url);
  if (status === 404) throw new Error(`HTTP 404 for ${url}`);
  const codes = {};
  let skippedNonGeographic = 0; // id="001" territories (+800, +870 …) have no ISO2 code
  for (const [, attrs] of xml.matchAll(/<territory\b([^>]*)>/g)) {
    const id = /\bid="([^"]+)"/.exec(attrs)?.[1];
    const countryCode = /\bcountryCode="(\d+)"/.exec(attrs)?.[1];
    if (!id || !countryCode) continue;
    if (!/^[A-Z]{2}$/.test(id)) skippedNonGeographic++;
    else codes[id] = `+${countryCode}`;
  }
  await writeJson('calling-codes.json', codes);
  console.log(`libphonenumber ${tag}: ${Object.keys(codes).length} calling codes`);
  return {
    tag,
    url,
    licence: 'Apache 2.0 — only <territory id/countryCode> pairs are taken, no patterns',
    territories: Object.keys(codes).length,
    skippedNonGeographic
  };
}

// ------------------------------------------------------------------ manifest + summary

async function removeStale(dir) {
  const removed = [];
  for (const name of await readdir(path.join(OUT, dir)).catch(() => [])) {
    const rel = `${dir}/${name}`;
    if (!name.endsWith('.json') || written.has(rel)) continue;
    await rm(path.join(OUT, rel));
    removed.push(rel);
  }
  return removed;
}

async function writeManifest(sources) {
  const files = {};
  let bytes = 0;
  for (const rel of [...written].sort()) {
    const buf = await readFile(path.join(OUT, rel));
    files[rel] = sha256(buf);
    bytes += buf.length;
  }
  const count = (prefix) => [...written].filter((f) => f.startsWith(prefix)).length;
  sources.google.files = count('google/');
  sources.cldr.files = count('cldr/');
  sources.libphonenumber.files = count('calling-codes.json');
  await writeJson('manifest.json', { fetchedAt: new Date().toISOString(), sources, files });
  return bytes;
}

function summarize(records) {
  const codes = Object.keys(records).filter((c) => c !== 'ZZ').sort();
  const having = (field) => codes.filter((c) => records[c][field]);
  const silent = codes.filter((c) => !records[c].sub_keys);
  const noFmt = codes.filter((c) => !records[c].fmt);
  const counts = ['sub_keys', 'lfmt', 'zip'].map((f) => `${f}: ${having(f).length}`);
  console.log(`  ${counts.join(', ')}`);
  console.log(`  silent (no sub_keys) ${silent.length}: ${silent.join(' ')}`);
  console.log(`  without fmt (inherit ZZ) ${noFmt.length}: ${noFmt.join(' ')}`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const google = await fetchGoogle();
  const cldr = await fetchCldr(google.records);
  const libphonenumber = await fetchCallingCodes();
  const { failures } = google.manifest;
  // Never prune on a partial run: a transient failure must not delete a good record.
  const removed = failures.length
    ? []
    : [...(await removeStale('google')), ...(await removeStale('cldr'))];
  const bytes = await writeManifest({ google: google.manifest, cldr, libphonenumber });
  console.log(`Snapshot: ${written.size} files, ${Math.round(bytes / 1024)} KB in ${OUT}`);
  summarize(google.records);
  if (cldr.missingLocales.length) {
    console.log(`  CLDR locales missing upstream: ${cldr.missingLocales.join(' ')}`);
  }
  if (removed.length) console.log(`  removed stale files: ${removed.join(' ')}`);
  if (failures.length) {
    console.error('! Google records that failed:', failures);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

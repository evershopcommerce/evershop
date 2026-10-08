/**
 * Country helpers over the generated list (specification § 3.3). `locale` is
 * accepted on every function from day one and ignored in this release: names
 * are English; CLDR territory names are a later generator addition with no
 * signature change.
 */
import { COUNTRIES } from './data/countries.js';
import type { Country } from './types.js';

let byCode: Map<string, Country> | undefined;

function index(): Map<string, Country> {
  if (!byCode) {
    byCode = new Map(COUNTRIES.map((c) => [c.code.toUpperCase(), c]));
  }
  return byCode;
}

function normalizeCode(code: string | undefined | null): string {
  return typeof code === 'string' ? code.trim().toUpperCase() : '';
}

/** Every known country, copied and sorted by English name. */
export function getCountries(_locale?: string): Country[] {
  return COUNTRIES.map((c) => ({ ...c })).sort((a, b) =>
    a.name.localeCompare(b.name, 'en')
  );
}

/** English name for a code; falls back to the code itself. */
export function getCountryName(code: string, _locale?: string): string {
  return index().get(normalizeCode(code))?.name ?? code;
}

export function isKnownCountry(code: string): boolean {
  const cc = normalizeCode(code);
  return cc !== '' && index().has(cc);
}

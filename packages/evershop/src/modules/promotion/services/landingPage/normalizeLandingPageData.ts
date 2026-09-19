/**
 * Coerce inbound landing-page data into DB-ready shapes:
 * - `status` → boolean (forms/REST may send `true`/`1`/`'1'`);
 * - empty-string schedule dates → `null` (a cleared datetime field posts `''`,
 *   which a `TIMESTAMPTZ` column rejects).
 * Returns the same object (mutated) for chaining.
 */
export function normalizeLandingPageData<T extends Record<string, any>>(
  data: T
): T {
  if (data.status !== undefined) {
    (data as any).status =
      data.status === true || data.status === 1 || data.status === '1';
  }
  for (const key of ['publish_start', 'publish_end']) {
    if (data[key] === '' || data[key] === undefined) {
      (data as any)[key] = data[key] === '' ? null : data[key];
    }
  }
  return data;
}

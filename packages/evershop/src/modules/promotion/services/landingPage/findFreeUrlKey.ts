/**
 * Find a url_key that is not taken, starting from `base` (optionally with a
 * fixed `suffix`, e.g. `copy` → `<base>-copy`) and appending `-2`, `-3`, …
 * until `isTaken` says no. Pure apart from the injected predicate, so it is
 * unit-testable and shared by Duplicate (`-copy`) and the homepage backup.
 */
export async function findFreeUrlKey(
  isTaken: (candidate: string) => Promise<boolean>,
  base: string,
  suffix?: string
): Promise<string> {
  const first = suffix ? `${base}-${suffix}` : base;
  let candidate = first;
  let n = 1;
  while (await isTaken(candidate)) {
    n += 1;
    candidate = `${first}-${n}`;
  }
  return candidate;
}

import stableStringify from 'fast-json-stable-stringify';

/**
 * Produce a canonical JSON representation of a value: object keys in
 * lexicographic order at every nesting level, no whitespace. Two values with
 * the same canonical form are equal under spec 04 § 7.2.4.
 *
 * Arrays are NOT sorted — order is semantic for placements and slideshow
 * slides. Numbers keep their JSON form (`100`, never `100.0`), so `100` and
 * `100.0` canonicalize identically while `100` and `"100"` do not.
 */
export function canonicalize(value: unknown): string {
  return stableStringify(value);
}

export function canonicallyEqual(a: unknown, b: unknown): boolean {
  return canonicalize(a) === canonicalize(b);
}

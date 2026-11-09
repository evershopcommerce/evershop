/**
 * Turns a name into a URL key: `Bánh sinh nhật` → `banh-sinh-nhat` (D-24). A copy
 * of `lib/util/slugify.ts`, which the stages must not import (the lint rule on
 * `services/`); a test compares the two on random text, so they cannot drift.
 * The result matches `^[a-z0-9]+(?:-[a-z0-9]+)*$`, or is empty when nothing
 * survives (a name with no Latin letters).
 */
export function slugify(value: string): string {
  return (
    value
      .normalize('NFD')
      // Combining diacritical marks left behind by NFD.
      .replace(/[̀-ͯ]/g, '')
      // Vietnamese đ/Đ is a distinct letter with no combining form.
      .replace(/[đĐ]/g, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );
}

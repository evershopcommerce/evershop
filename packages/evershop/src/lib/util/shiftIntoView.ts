/**
 * How far to move a box sideways so it stays inside the viewport, with a gutter on each side.
 *
 * Returns a signed number of pixels (negative moves it left), or 0 when the box already fits.
 * Takes the box's current left and right edges and the viewport's width, so it is pure geometry:
 * the caller measures, this decides, the caller applies.
 *
 * A box wider than the room it has is lined up with the left gutter and runs off the right instead:
 * the start of a menu is the part that has to be reachable.
 *
 * Why it exists: a popup anchored to the left edge of its trigger (`left-0`) runs off the right of a
 * phone when the trigger is anywhere but the left, and a centred logo is the commonest header there
 * is (the mobile menu panel at 390px, theme-lab FINDINGS #53). Anchoring is the design; fitting is
 * not the theme's job.
 */
export function shiftIntoView(
  left: number,
  right: number,
  viewportWidth: number,
  gutter = 8
): number {
  const room = viewportWidth - 2 * gutter;
  if (right - left > room) {
    return gutter - left;
  }
  if (left < gutter) {
    return gutter - left;
  }
  if (right > viewportWidth - gutter) {
    return viewportWidth - gutter - right;
  }
  return 0;
}

/**
 * Deep-equal for `route_cursors` maps. Order-independent (JSON.stringify can't
 * be trusted when keys are added in different order). Used to drive the
 * Save-button enabled state — editor cursors vs rollout's saved snapshot.
 */
export function cursorsEqual(
  a: Record<string, number> | null | undefined,
  b: Record<string, number> | null | undefined
): boolean {
  const aMap = a ?? {};
  const bMap = b ?? {};
  const keys = new Set([...Object.keys(aMap), ...Object.keys(bMap)]);
  for (const k of keys) {
    if (Number(aMap[k] ?? 0) !== Number(bMap[k] ?? 0)) return false;
  }
  return true;
}

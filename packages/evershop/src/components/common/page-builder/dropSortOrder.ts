/**
 * Computes the sort_order for a new placement at the position of `zoneEl`
 * (a drop-zone element rendered inside an Area).
 *
 * The iframe is the only place that sees the full rendered ordering — layout
 * components like ShoppingCart, widget instances, container children, all
 * interleaved by `sortOrder`. Every renderable is tagged with
 * `data-evershop-pb-sort-order` by `Area.tsx` (for layout / core components)
 * and `WidgetChrome.tsx` (for widget instances).
 *
 * We walk siblings outward from the drop zone, skipping anything that isn't
 * tagged (other drop zones, debug spans, etc.), to find the previous and
 * next sort_order. Midpoint between them is what the new placement should
 * use.
 *
 * Edge cases:
 *   - Drop at the very top of an area (no prev): `next - 1` (lands above
 *     everything currently rendered, including layout components).
 *   - Drop at the very bottom of an area (no next): `prev + 1`.
 *   - Drop into a completely empty area (no neighbors at all): `100` —
 *     matches the existing "fresh area" convention so layout components in
 *     the 1–20 range still render above.
 */
export function computeDropSortOrder(zoneEl: Element): number {
  const prev = walk(zoneEl, 'previousElementSibling');
  const next = walk(zoneEl, 'nextElementSibling');
  if (prev != null && next != null) return (prev + next) / 2;
  if (prev != null) return prev + 1;
  if (next != null) return next - 1;
  return 100;
}

/**
 * Computes the sort_order that moves `widgetEl` (a tagged renderable — in
 * practice the WidgetChrome wrapper) one visible step up or down within its
 * Area: past its nearest *rendering* tagged sibling, layout components
 * included — not just past the nearest widget, which is what the legacy
 * admin-side swap could see.
 *
 * Landing rules mirror the drop math:
 *   - Between two neighbors: their midpoint.
 *   - Past the outermost neighbor (top / bottom of the area): `± 1`.
 *   - Already first (moving up) / last (moving down): `null` — no-op,
 *     callers should not emit an op.
 *   - Neighbors tied on the same sort value: landing strictly between two
 *     equal values is impossible, so land just past both (`± 1`).
 *
 * Unlike the drop walk above, wrappers that rendered nothing
 * (`childNodes.length === 0` — a layout component that returned null, e.g.
 * Breadcrumb on the homepage) are skipped: stepping "past" an invisible
 * element would be a click that visibly does nothing.
 */
export function computeMoveSortOrder(
  widgetEl: Element,
  direction: 'up' | 'down'
): number | null {
  const dir =
    direction === 'up' ? 'previousElementSibling' : 'nextElementSibling';
  const near = walkVisible(widgetEl, dir);
  if (near == null) return null;
  const far = walkVisible(near.el, dir);
  if (far == null || far.sort === near.sort) {
    return direction === 'up' ? near.sort - 1 : near.sort + 1;
  }
  return (near.sort + far.sort) / 2;
}

function walk(
  start: Element,
  direction: 'previousElementSibling' | 'nextElementSibling'
): number | null {
  let el: Element | null = start[direction];
  while (el) {
    const raw = (el as HTMLElement).getAttribute(
      'data-evershop-pb-sort-order'
    );
    if (raw != null && raw !== '') {
      const n = Number(raw);
      if (!Number.isNaN(n)) return n;
    }
    el = el[direction];
  }
  return null;
}

function walkVisible(
  start: Element,
  direction: 'previousElementSibling' | 'nextElementSibling'
): { el: Element; sort: number } | null {
  let el: Element | null = start[direction];
  while (el) {
    const raw = (el as HTMLElement).getAttribute(
      'data-evershop-pb-sort-order'
    );
    if (raw != null && raw !== '' && el.childNodes.length > 0) {
      const n = Number(raw);
      if (!Number.isNaN(n)) return { el, sort: n };
    }
    el = el[direction];
  }
  return null;
}

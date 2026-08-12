import {
  computeDropSortOrder,
  computeMoveSortOrder
} from '../../dropSortOrder.js';

/**
 * Pure-logic tests for the iframe-side move math (`computeMoveSortOrder`)
 * and its deliberate asymmetry with the drop math (`computeDropSortOrder`).
 *
 * Jest runs in the `node` environment (no jsdom), and the walk only touches
 * three DOM APIs — `previousElementSibling` / `nextElementSibling`,
 * `getAttribute('data-evershop-pb-sort-order')`, and `childNodes.length` —
 * so a hand-rolled sibling chain of stubs is enough.
 */

interface StubSpec {
  /** data-evershop-pb-sort-order value; omit for untagged (drop zones). */
  sort?: number;
  /** Renders nothing — a layout component that returned null. */
  empty?: boolean;
}

interface StubEl {
  previousElementSibling: StubEl | null;
  nextElementSibling: StubEl | null;
  childNodes: unknown[];
  getAttribute(name: string): string | null;
}

/** Build a linked sibling chain in DOM order and return it. */
function chain(specs: StubSpec[]): StubEl[] {
  const els: StubEl[] = specs.map((spec) => ({
    previousElementSibling: null,
    nextElementSibling: null,
    childNodes: spec.empty ? [] : [{}],
    getAttribute: (name: string) =>
      name === 'data-evershop-pb-sort-order' && spec.sort !== undefined
        ? String(spec.sort)
        : null
  }));
  els.forEach((el, i) => {
    el.previousElementSibling = els[i - 1] ?? null;
    el.nextElementSibling = els[i + 1] ?? null;
  });
  return els;
}

const asEl = (el: StubEl) => el as unknown as Element;

// A drop zone: untagged sibling the walks must skip.
const zone: StubSpec = {};

describe('computeMoveSortOrder', () => {
  // The productView shape after a drop between the layout components:
  // Breadcrumb@0, widget@5, ProductView@10 (zones interleaved).
  const productViewShape = (): StubEl[] =>
    chain([zone, { sort: 0 }, zone, { sort: 5 }, zone, { sort: 10 }, zone]);

  it('moves up past a layout component to the top of the area (next − 1)', () => {
    const els = productViewShape();
    expect(computeMoveSortOrder(asEl(els[3]), 'up')).toBe(-1);
  });

  it('moves down past a layout component to the bottom of the area (prev + 1)', () => {
    const els = productViewShape();
    expect(computeMoveSortOrder(asEl(els[3]), 'down')).toBe(11);
  });

  it('lands on the midpoint when two renderables sit beyond the neighbor', () => {
    // X@0, Y@10, W@15 — moving W up steps past Y into midpoint(0, 10).
    const els = chain([{ sort: 0 }, zone, { sort: 10 }, zone, { sort: 15 }]);
    expect(computeMoveSortOrder(asEl(els[4]), 'up')).toBe(5);
  });

  it('returns null when already first (up) or last (down)', () => {
    const els = chain([{ sort: 5 }, zone, { sort: 10 }]);
    expect(computeMoveSortOrder(asEl(els[0]), 'up')).toBeNull();
    expect(computeMoveSortOrder(asEl(els[2]), 'down')).toBeNull();
    // A lone renderable can't move anywhere.
    const lone = chain([zone, { sort: 100 }, zone]);
    expect(computeMoveSortOrder(asEl(lone[1]), 'up')).toBeNull();
    expect(computeMoveSortOrder(asEl(lone[1]), 'down')).toBeNull();
  });

  it('skips wrappers that rendered nothing (null layout components)', () => {
    // A@0, EMPTY@5, W@10 — up must step past A (the nearest VISIBLE
    // renderable), not stop at the invisible wrapper.
    const els = chain([
      { sort: 0 },
      zone,
      { sort: 5, empty: true },
      zone,
      { sort: 10 }
    ]);
    expect(computeMoveSortOrder(asEl(els[4]), 'up')).toBe(-1);
  });

  it('lands past both neighbors when they are tied on one sort value', () => {
    // A@10, B@10, W@20 — strictly between two equal values is impossible.
    const els = chain([{ sort: 10 }, zone, { sort: 10 }, zone, { sort: 20 }]);
    expect(computeMoveSortOrder(asEl(els[4]), 'up')).toBe(9);
  });
});

describe('computeDropSortOrder (walk asymmetry)', () => {
  it('does NOT skip empty wrappers — their sort still anchors the midpoint', () => {
    // A@0, EMPTY@5, [zone], B@10 — the zone after the empty wrapper is
    // hidden by CSS, but the empty wrapper's sort participates in walks
    // from other zones: prev = 5, next = 10 → 7.5.
    const els = chain([
      { sort: 0 },
      zone,
      { sort: 5, empty: true },
      zone,
      { sort: 10 }
    ]);
    expect(computeDropSortOrder(asEl(els[3]))).toBe(7.5);
  });

  it('keeps the documented edge rules', () => {
    const els = chain([zone, { sort: 0 }, zone, { sort: 10 }, zone]);
    expect(computeDropSortOrder(asEl(els[0]))).toBe(-1); // top: next − 1
    expect(computeDropSortOrder(asEl(els[2]))).toBe(5); // midpoint
    expect(computeDropSortOrder(asEl(els[4]))).toBe(11); // bottom: prev + 1
    const empty = chain([zone]);
    expect(computeDropSortOrder(asEl(empty[0]))).toBe(100); // fresh area
  });
});

/**
 * Items → parcels (the cart `packages` field).
 *
 * Real cartonization is out of scope (see wiki/package-management-design.md →
 * non-goals). The DEFAULT heuristic here is deliberately simple: ONE parcel,
 * sized by the LARGEST item-package by volume, carrying that package's tare.
 * Extensions with real packing logic override the whole strategy:
 *
 *   addProcessor('cartPackages', (parcels, { items }) => myPacking(items));
 *
 * The output shape is consumed by:
 *   - the `total_weight` cart-field resolver (adds Σ parcel.tareWeight — the
 *     ONLY place tare enters the quote-side weight; per-item weights stay
 *     goods-only everywhere, so there is no double counting), and
 *   - admin/display surfaces via `cart.packages` (persisted JSONB).
 */

/** One candidate = one shippable cart item's package. */
export interface PackingCandidate {
  packageUuid: string | null;
  name: string | null;
  /** Store dimension unit (`shop.dimensionUnit`). */
  length: number;
  width: number;
  height: number;
  /** Tare — the empty package's own weight, store weight unit. */
  tareWeight: number;
}

export interface Parcel {
  packageUuid: string | null;
  name: string | null;
  length: number;
  width: number;
  height: number;
  /** The empty package's weight (store weight unit). */
  tareWeight: number;
  /** Σ item weight × qty across the parcel's items (store weight unit). */
  goodsWeight: number;
}

/**
 * Default single-parcel proposal. Returns [] when no item carries package
 * dimensions (legacy products) — tare then contributes nothing and the cart
 * behaves exactly as before the feature.
 */
export function buildDefaultParcels(
  candidates: PackingCandidate[],
  goodsWeight: number
): Parcel[] {
  const withDims = candidates.filter(
    (c) =>
      Number.isFinite(c.length) &&
      Number.isFinite(c.width) &&
      Number.isFinite(c.height) &&
      c.length > 0 &&
      c.width > 0
  );
  if (withDims.length === 0) {
    return [];
  }
  // Largest by volume. A flat envelope (height 0) has volume 0 — treat
  // height as min 1 unit for comparison only, so an envelope still wins
  // over nothing but loses to any real box.
  const volume = (c: PackingCandidate) =>
    c.length * c.width * Math.max(c.height, 1);
  const biggest = withDims.reduce((a, b) => (volume(b) > volume(a) ? b : a));
  return [
    {
      packageUuid: biggest.packageUuid,
      name: biggest.name,
      length: biggest.length,
      width: biggest.width,
      height: biggest.height,
      tareWeight: Number.isFinite(biggest.tareWeight) ? biggest.tareWeight : 0,
      goodsWeight: parseFloat((Number(goodsWeight) || 0).toFixed(4))
    }
  ];
}

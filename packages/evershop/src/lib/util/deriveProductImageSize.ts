/**
 * Derive the render dimensions for a product image at a given placement.
 *
 * `original` is the store's configured "original product image size" (the admin Catalog
 * setting / `catalog.product.image.*`): it defines both the reference **aspect ratio** and
 * the **maximum resolution**. `baseWidth` is the placement's target width — chosen at roughly
 * 2x the CSS display width so retina / DPR-2 screens stay sharp (the `<Image>` srcset covers
 * the rest).
 *
 * The returned `width` is clamped to `original.width` so we never request more than the store
 * actually has (no upscaling), and `height` is derived from the original aspect ratio so every
 * placement (listing, PDP, cart, checkout) renders at the store's true proportions. When no
 * usable original is configured, it falls back to a square box at the requested width.
 */
export function deriveProductImageSize(
  baseWidth: number,
  original: { width?: number; height?: number } | null | undefined
): { width: number; height: number } {
  const originalWidth = Number(original?.width) || 0;
  const originalHeight = Number(original?.height) || 0;
  if (originalWidth <= 0 || originalHeight <= 0) {
    return { width: baseWidth, height: baseWidth };
  }
  const width = Math.min(baseWidth, originalWidth);
  const height = Math.max(
    1,
    Math.round((width * originalHeight) / originalWidth)
  );
  return { width, height };
}

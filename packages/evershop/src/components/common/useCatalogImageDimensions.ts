import { useAppState } from './context/app.js';

const DEFAULT_DIMENSIONS = { width: 1200, height: 1200 };

/**
 * The store's configured original product image dimensions, read from the eContext
 * (`config.catalog.imageDimensions`, written by `lib/response/render.ts` from the admin
 * Catalog setting). Falls back to a 1:1 `1200x1200` when absent. Pair with
 * `deriveProductImageSize` to render every product-image placement at the store's aspect
 * ratio and resolution ceiling.
 */
export function useCatalogImageDimensions(): { width: number; height: number } {
  const state = useAppState();
  const dims = state?.config?.catalog?.imageDimensions;
  if (dims && dims.width > 0 && dims.height > 0) {
    return dims;
  }
  return DEFAULT_DIMENSIONS;
}

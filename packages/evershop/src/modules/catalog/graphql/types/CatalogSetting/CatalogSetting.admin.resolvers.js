import {
  getCollectionPageSize,
  getProductImageDimensions,
  getShowOutOfStockProducts
} from '../../../services/catalogSettings.js';

// Admin-only pre-fill values for the Catalog settings form. Each field returns the typed
// getter (setting → config → default, already coerced), so coercion lives in exactly one place.
export default {
  Setting: {
    catalogShowOutOfStockProduct: () => getShowOutOfStockProducts(),
    catalogCollectionPageSize: () => getCollectionPageSize(),
    catalogProductImageWidth: () => getProductImageDimensions().width,
    catalogProductImageHeight: () => getProductImageDimensions().height
  }
};

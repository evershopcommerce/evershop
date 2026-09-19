import {
  buildFilterFromUrl,
  FilterInput
} from '../../../../../lib/util/buildFilterFromUrl.js';
import { toPrice } from '../../../../checkout/services/toPrice.js';
import { getCategoryTree } from '../../../services/getCategoryTree.js';
import { getStoreFilterableAttributes } from '../../../services/getFilterableAttributes.js';
import { getProductsBaseQuery } from '../../../services/getProductsBaseQuery.js';
import { getStorePriceRange } from '../../../services/getStorePriceRange.js';
import { ProductCollection } from '../../../services/ProductCollection.js';

/**
 * The `/products` listing — a category page without the category.
 *
 * Route-gated exactly like `Query.currentCategory` and `Query.productSearch`:
 * the field only resolves on its own route, so the merged per-route query of
 * any other page cannot accidentally pull a whole store-wide collection.
 *
 * The parent object carries only the URL-derived filters. Every field resolver
 * below derives what it needs from those, which keeps this free of the
 * `typeof category.products === 'function'` trick the Category resolver needs.
 */

interface ProductListingParent {
  filters: FilterInput[];
}

export default {
  Query: {
    productListing: async (
      _: unknown,
      __: unknown,
      { currentRoute, currentUrl }: { currentRoute?: { id?: string }; currentUrl: string }
    ): Promise<ProductListingParent | null> => {
      if (currentRoute?.id !== 'productListing') {
        return null;
      }
      return { filters: buildFilterFromUrl(currentUrl) };
    }
  },

  ProductListing: {
    products: async (
      parent: ProductListingParent,
      { filters = [] }: { filters?: FilterInput[] }
    ) => {
      // No category predicate — this IS the whole catalog. Everything else
      // (status/visibility/stock guards, variant collapsing, keyword, price,
      // attribute filters, ob/od, page/limit) comes from ProductCollection.
      const root = new ProductCollection(getProductsBaseQuery());
      // Explicit GraphQL arguments win over the URL, matching currentCategory.
      await root.init([...parent.filters, ...filters], false);
      return root;
    },

    // Every filterable attribute with at least one product carrying a value,
    // across all attribute groups. Groups are an admin authoring construct —
    // they decide which fields a product form shows — and were deliberately
    // not surfaced as a shopper-facing facet.
    availableAttributes: () => getStoreFilterableAttributes(),

    priceRange: async () => {
      const { min, max } = await getStorePriceRange();
      return {
        min,
        max,
        // toPrice takes the raw DB string; ours are already parsed numbers.
        minText: toPrice(String(min), true),
        maxText: toPrice(String(max), true)
      };
    },

    categories: () => getCategoryTree()
  }
};

import { select } from '@evershop/postgres-query-builder';
import { camelCase } from '../../../../../../lib/util/camelCase.js';
import { resolveLink } from '../../../../../../lib/widget/linkResolver.js';
import { getProductsByCollectionBaseQuery } from '../../../../services/getProductsByCollectionBaseQuery.js';
import { ProductCollection } from '../../../../services/ProductCollection.js';

/**
 * Collection stack widget resolver — fans out one DB lookup per row to
 * resolve `source` → collection_id, then runs the standard
 * getProductsByCollectionBaseQuery to fetch each row's products.
 *
 * Rows whose `source` doesn't resolve to a collection are dropped so the
 * storefront never renders an empty heading. Each row's products array
 * is truncated to `productCount` after the typical Product post-processing
 * runs through `ProductCollection.init`.
 */
export default {
  Query: {
    collectionStackWidget: async (
      _,
      { collections, productCount, showPrice, divider },
      { pool, user, linkLoaders }
    ) => {
      const pcNum = Math.round(Number(productCount));
      const safeProductCount =
        Number.isFinite(pcNum) && pcNum >= 2 && pcNum <= 4 ? pcNum : 4;
      const rawCollections = Array.isArray(collections) ? collections : [];

      const rows = await Promise.all(
        rawCollections
          .filter((c) => c && typeof c === 'object' && c.source && c.title)
          .slice(0, 3)
          .map(async (row) => {
            const col = await select()
              .from('collection')
              .where('code', '=', row.source)
              .load(pool);
            if (!col) return null;
            const query = getProductsByCollectionBaseQuery(col.collection_id);
            const productList = new ProductCollection(query);
            await productList.init(
              [
                { key: 'limit', operation: 'eq', value: String(safeProductCount) },
                { key: 'page', operation: 'eq', value: '1' }
              ],
              !!user
            );
            const itemsResult = await productList.items();
            const items = Array.isArray(itemsResult) ? itemsResult : [];
            // resolveLink: URN → current URL via per-request batched loader;
            // plain URL passthrough.
            const viewAllLink = row.viewAllLink
              ? await resolveLink(row.viewAllLink, linkLoaders)
              : null;
            return {
              id: row.id || row.source,
              title: row.title,
              subText: row.subText || null,
              source: row.source,
              viewAllLink: viewAllLink || null,
              viewAllLabel: row.viewAllLabel || 'View all →',
              products: items.map(camelCase)
            };
          })
      );

      return {
        rows: rows.filter(Boolean),
        productCount: safeProductCount,
        showPrice: showPrice !== undefined ? Boolean(showPrice) : true,
        divider: divider !== undefined ? Boolean(divider) : true
      };
    }
  }
};

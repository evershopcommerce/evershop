import { select } from '@evershop/postgres-query-builder';
import { camelCase } from '../../../../../../lib/util/camelCase.js';
import { getProductsByCollectionBaseQuery } from '../../../../services/getProductsByCollectionBaseQuery.js';
import { ProductCollection } from '../../../../services/ProductCollection.js';

/**
 * Collection spotlight resolver. Fetches the picked collection (by code)
 * and its first N products, plus a total count for the "View all N →"
 * label. Falls back to empty arrays when the collection is missing so the
 * storefront component can branch cleanly.
 */
export default {
  Query: {
    collectionSpotlightWidget: async (
      _,
      {
        collection,
        image,
        imageAlt,
        imagePosition,
        imageWidth,
        imageHeight,
        eyebrow,
        heading,
        body,
        previewCount
      },
      { pool, user }
    ) => {
      // Input was widened to Float to tolerate slider mid-drag values; we
      // round + clamp to the two allowed previews here.
      const allowedCount = Math.round(Number(previewCount)) === 2 ? 2 : 4;
      const safePosition = imagePosition === 'right' ? 'right' : 'left';
      const w = Number(imageWidth);
      const h = Number(imageHeight);

      // Default empties — used when the picked collection doesn't resolve.
      let previewProducts = [];
      let totalProducts = 0;
      let collectionName = null;

      if (collection) {
        const col = await select()
          .from('collection')
          .where('code', '=', collection)
          .load(pool);
        if (col) {
          collectionName = col.name;

          // Preview slice.
          const previewQuery = getProductsByCollectionBaseQuery(col.collection_id);
          const previewList = new ProductCollection(previewQuery);
          await previewList.init(
            [
              { key: 'limit', operation: 'eq', value: String(allowedCount) },
              { key: 'page', operation: 'eq', value: '1' }
            ],
            !!user
          );
          const items = await previewList.items();
          previewProducts = (Array.isArray(items) ? items : []).map(camelCase);

          // Full total — separate `total` lookup so we can show the live count
          // without fetching every row.
          const totalQuery = getProductsByCollectionBaseQuery(col.collection_id);
          const totalList = new ProductCollection(totalQuery);
          await totalList.init(
            [{ key: 'limit', operation: 'eq', value: '1' }],
            !!user
          );
          const total = await totalList.total();
          totalProducts = typeof total === 'number' ? total : 0;
        }
      }

      return {
        collection: collection || null,
        image: image || null,
        imageAlt: imageAlt || '',
        imagePosition: safePosition,
        imageWidth: Number.isFinite(w) && w > 0 ? Math.round(w) : null,
        imageHeight: Number.isFinite(h) && h > 0 ? Math.round(h) : null,
        eyebrow: eyebrow || null,
        heading: heading || (collectionName ?? ''),
        body: body || null,
        previewCount: allowedCount,
        previewProducts,
        totalProducts,
        collectionName
      };
    }
  }
};

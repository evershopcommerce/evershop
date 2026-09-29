import { select } from '@evershop/postgres-query-builder';
import { camelCase } from '../../../../../../lib/util/camelCase.js';
import { getVirtualCollection } from '../../../../../../lib/util/virtualCollection.js';
import { resolveLink } from '../../../../../../lib/widget/linkResolver.js';
import { getProductsBaseQuery } from '../../../../services/getProductsBaseQuery.js';
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
        previewCount,
        viewAllLink,
        viewAllLabel
      },
      { pool, user, linkLoaders }
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
        // A virtual collection has no row: it is answered by a query, so a
        // theme's widget resolves on any store (services/virtualCollection.js).
        // A real collection always wins — this runs only when the lookup misses.
        const virtual = col ? null : getVirtualCollection(collection);
        const membersQuery = () =>
          col ? getProductsByCollectionBaseQuery(col.collection_id) : getProductsBaseQuery();
        if (col || virtual) {
          collectionName = col ? col.name : virtual.name;

          // Preview slice.
          const previewQuery = membersQuery();
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
          const totalQuery = membersQuery();
          const totalList = new ProductCollection(totalQuery);
          await totalList.init(
            [{ key: 'limit', operation: 'eq', value: '1' }],
            !!user
          );
          // Postgres returns COUNT as a bigint, which node-postgres hands back
          // as a STRING — the old `typeof total === 'number'` guard therefore
          // discarded every count and the widget always said 0 products
          // (2026-09-18). GraphQL coerces the string elsewhere, which is why
          // only this hand-rolled check was affected.
          const total = Number(await totalList.total());
          totalProducts = Number.isFinite(total) ? total : 0;
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
        collectionName,
        // Resolve the "View all" target (URN → current URL); a plain URL
        // passes through. Collections have no public page, so this is an
        // explicit merchant-chosen link rather than a hardcoded route.
        viewAllLink: viewAllLink
          ? (await resolveLink(viewAllLink, linkLoaders)) ?? null
          : null,
        viewAllLabel: viewAllLabel || null
      };
    }
  }
};

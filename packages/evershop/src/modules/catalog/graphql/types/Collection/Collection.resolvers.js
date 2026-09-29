import { select } from '@evershop/postgres-query-builder';
import { v4 as uuidv4 } from 'uuid';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { CollectionCollection } from '../../../../../modules/catalog/services/CollectionCollection.js';
import { getCollectionsBaseQuery } from '../../../../../modules/catalog/services/getCollectionsBaseQuery.js';
import { getProductsBaseQuery } from '../../../../../modules/catalog/services/getProductsBaseQuery.js';
import { getProductsByCollectionBaseQuery } from '../../../../../modules/catalog/services/getProductsByCollectionBaseQuery.js';
import { ProductCollection } from '../../../../../modules/catalog/services/ProductCollection.js';
import {
  getVirtualCollection,
  isVirtualCollection
} from '../../../../../lib/util/virtualCollection.js';

export default {
  Query: {
    collection: async (_, { code }, { pool }) => {
      const query = select().from('collection');
      query.where('code', '=', code);
      const result = await query.load(pool);
      if (result) {
        return camelCase(result);
      }
      // No row: the code may be a VIRTUAL collection — one answered by a query
      // instead of by rows, so a theme's widget resolves on any store (see
      // services/virtualCollection.js). A real collection always wins, which is
      // why this runs only after the lookup misses.
      //
      // Answered for admin requests too, deliberately: the page builder renders
      // the REAL storefront widgets inside its iframe, with an admin session, so
      // gating on `user` left every preview showing "pick a collection". The
      // admin's own collection surfaces cannot reach this anyway — the grid and
      // the pickers list rows via `collections`, and the edit route looks a row
      // up by uuid and 404s. What a merchant CAN do is pick it deliberately: the
      // widget's setting component offers it, marked "built-in".
      return getVirtualCollection(code);
    },
    collections: async (_, { filters = [] }) => {
      const query = getCollectionsBaseQuery();
      const root = new CollectionCollection(query);
      await root.init(filters);
      return root;
    }
  },
  Collection: {
    products: async (collection, { filters = [] }, { user }) => {
      // A virtual collection has no `collection_id` to join on: its members are
      // whatever the query says. `ProductCollection` already orders newest
      // first and hides disabled/invisible products from the storefront, so
      // "the newest products" is the base query with nothing added.
      const query = isVirtualCollection(collection)
        ? getProductsBaseQuery()
        : getProductsByCollectionBaseQuery(collection.collectionId);
      const root = new ProductCollection(query);
      await root.init(filters, !!user);
      return root;
    },
    description: ({ description }) => {
      try {
        return JSON.parse(description);
      } catch (e) {
        // This is for backward compatibility. If the description is not a JSON string then it is a raw HTML block
        const rowId = `r__${uuidv4()}`;
        return [
          {
            size: 1,
            id: rowId,
            columns: [
              {
                id: 'c__c5d90067-c786-4324-8e24-8e30520ac3d7',
                size: 1,
                data: {
                  time: 1723347125344,
                  blocks: [
                    {
                      id: 'AU89ItzUa7',
                      type: 'raw',
                      data: {
                        html: description
                      }
                    }
                  ],
                  version: '2.30.2'
                }
              }
            ]
          }
        ];
      }
    }
  },
  Product: {
    collections: async (product, _, { pool }) => {
      const query = getCollectionsBaseQuery();
      query
        .leftJoin('product_collection')
        .on(
          'collection.collection_id',
          '=',
          'product_collection.collection_id'
        );
      query.where('product_id', '=', product.productId);
      return (await query.execute(pool)).map((row) => camelCase(row));
    }
  }
};

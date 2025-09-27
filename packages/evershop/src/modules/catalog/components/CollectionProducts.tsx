import { ProductList } from '@components/frontStore/catalog/ProductList.js';
import React from 'react';

interface CollectionProductsProps {
  collection: {
    collectionId: number;
    name: string;
    countPerRow?: number;
    products: {
      items: Array<React.ComponentProps<typeof ProductList>['products'][0]>;
    };
  } | null;
}
export default function CollectionProducts({
  collection
}: CollectionProductsProps) {
  if (!collection) {
    return null;
  }
  return (
    <div className="pt-7">
      <div className="page-width">
        <h3 className="mt-7 mb-7 text-center uppercase h5 tracking-widest">
          {collection?.name}
        </h3>
        <ProductList
          products={collection?.products?.items}
          gridColumns={collection?.countPerRow}
        />
      </div>
    </div>
  );
}

export const query = `
  query Query($collection: String, $count: Int, $countPerRow: Int) {
    collection (code: $collection) {
      collectionId
      name
      countPerRow
      products (filters: [{key: "limit", operation: eq, value: $count}]) {
        items {
          ...Product
        }
      }
    }
  }
`;

export const fragments = `
  fragment Product on Product {
    productId
    name
    sku
    price {
      regular {
        value
        text
      }
      special {
        value
        text
      }
    }
    inventory {
      isInStock
    }
    image {
      alt
      url
    }
    url
  }
`;

export const variables = `{
  collection: getWidgetSetting("collection"),
  count: getWidgetSetting("count"),
  countPerRow: getWidgetSetting("countPerRow", 4)
}`;

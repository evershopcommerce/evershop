import { Editor } from '@components/common/Editor.js';
import { Row } from '@components/common/form/Editor.js';
import { ProductList } from '@components/frontStore/catalog/ProductList.js';
import React from 'react';

interface CollectionProductsProps {
  collection: {
    collectionId: number;
    name: string;
    description?: Row[];
    products: {
      items: Array<React.ComponentProps<typeof ProductList>['products'][0]>;
    };
  } | null;
  collectionProductsWidget?: {
    countPerRow?: number;
  };
}
export default function CollectionProducts({
  collection,
  collectionProductsWidget: { countPerRow } = {}
}: CollectionProductsProps) {
  if (!collection) {
    return null;
  }
  return (
    <div className="pt-7 collection__products__widget">
      <div className="page-width">
        <h3 className="text-center uppercase h5 tracking-widest">
          {collection?.name}
        </h3>
        <div className="flex justify-center">
          {collection?.description && <Editor rows={collection?.description} />}
        </div>
        <div className="mt-3">
          <ProductList
            products={collection?.products?.items}
            gridColumns={countPerRow}
          />
        </div>
      </div>
    </div>
  );
}

export const query = `
  query Query($collection: String, $count: Int, $countPerRow: Int) {
    collection (code: $collection) {
      collectionId
      name
      description
      products (filters: [{key: "limit", operation: eq, value: $count}]) {
        items {
          ...Product
        }
      }
    }
    collectionProductsWidget(collection: $collection, count: $count, countPerRow: $countPerRow) {
      countPerRow
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

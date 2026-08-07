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
    <section className="collection__products__widget section">
      <div className="page-width">
        <div className="section-heading items-center text-center">
          <span className="eyebrow">Curated</span>
          <h2>{collection?.name}</h2>
          {collection?.description && (
            <div className="flex justify-center text-textSubdued">
              <Editor rows={collection?.description} />
            </div>
          )}
        </div>
        <ProductList
          products={collection?.products?.items}
          gridColumns={countPerRow}
          showAddToCart
        />
      </div>
    </section>
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

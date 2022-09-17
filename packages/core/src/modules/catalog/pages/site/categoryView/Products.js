import React from 'react';
import ProductList from '../../../components/product/list/List';

export default function Products({ products: { products: { items } } }) {
  return (
    <div className="page-width">
      <span className="product-count italic block mb-2">
        {`${items.length} products`}
      </span>
      <ProductList products={items} countPerRow={3} />
    </div>
  );
}

export const layout = {
  areaId: "content",
  sortOrder: 15
};

export const query = `
  query Query {
    products: category(id: getContextValue('categoryId')) {
      products(filters: getContextValue('filtersFromUrl')) {
        items {
          ...Product
        }
      }
    }
  }`;

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
    image {
      alt
      listing
    }
    url
  }
`;
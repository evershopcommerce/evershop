import ProductList from '@components/frontStore/catalog/product/list/List';
import PropTypes from 'prop-types';
import React from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';

export default function Products({
  products: {
    showProducts,
    products: { items }
  }
}) {
  if (!showProducts) {
    return null;
  }
  return (
    <div>
      <ProductList products={items} countPerRow={3} />
      <span className="product-count italic block mt-8">
        {_('${count} products', { count: items.length })}
      </span>
    </div>
  );
}

Products.propTypes = {
  products: PropTypes.shape({
    showProducts: PropTypes.number,
    products: PropTypes.shape({
      items: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string,
          productId: PropTypes.number,
          url: PropTypes.string,
          price: PropTypes.shape({
            regular: PropTypes.shape({
              value: PropTypes.number,
              text: PropTypes.string
            }),
            special: PropTypes.shape({
              value: PropTypes.number,
              text: PropTypes.string
            })
          }),
          image: PropTypes.shape({
            alt: PropTypes.string,
            listing: PropTypes.string
          })
        })
      )
    })
  })
};

Products.defaultProps = {
  products: {
    showProducts: 1,
    products: {
      items: []
    }
  }
};

export const layout = {
  areaId: 'rightColumn',
  sortOrder: 25
};

export const query = `
  query Query($filters: [FilterInput]) {
    products: category(id: getContextValue('categoryId')) {
      showProducts
      products(filters: $filters) {
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
      url: listing
    }
    url
  }
`;

export const variables = `
{
  filters: getContextValue('filtersFromUrl')
}`;

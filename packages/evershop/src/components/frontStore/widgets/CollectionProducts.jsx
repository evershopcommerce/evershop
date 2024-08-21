import ProductList from '@components/frontStore/catalog/product/list/List';
import PropTypes from 'prop-types';
import React from 'react';

export default function CollectionProducts({
  collection,
  collectionProductsWidget: { count }
}) {
  if (!collection) {
    return null;
  }
  return (
    <div className="pt-12">
      <div className="page-width">
        <h3 className="mt-12 mb-12 text-center uppercase h5 tracking-widest">
          {collection?.name}
        </h3>
        <ProductList
          products={collection?.products?.items}
          countPerRow={count}
        />
      </div>
    </div>
  );
}

CollectionProducts.propTypes = {
  collection: PropTypes.shape({
    collectionId: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    products: PropTypes.shape({
      items: PropTypes.arrayOf(
        PropTypes.shape({
          productId: PropTypes.number.isRequired,
          sku: PropTypes.string.isRequired,
          name: PropTypes.string.isRequired,
          price: PropTypes.shape({
            regular: PropTypes.shape({
              value: PropTypes.number.isRequired,
              text: PropTypes.string.isRequired
            }).isRequired,
            special: PropTypes.shape({
              value: PropTypes.number.isRequired,
              text: PropTypes.string.isRequired
            }).isRequired
          }).isRequired,
          image: PropTypes.shape({
            alt: PropTypes.string.isRequired,
            url: PropTypes.string.isRequired
          }).isRequired,
          url: PropTypes.string.isRequired
        })
      ).isRequired
    }).isRequired
  }).isRequired,
  collectionProductsWidget: PropTypes.shape({
    count: PropTypes.number
  }).isRequired
};

export const query = `
  query Query($collection: String) {
    collection (code: $collection) {
      collectionId
      name
      products (filters: [{key: "limit", operation: eq, value: "5"}]) {
        items {
          ...Product
        }
      }
    }
    collectionProductsWidget(collection: $collection) {
      count
    }
  }
`;

export const fragments = `
  fragment Product on Product {
    productId
    name
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

export const variables = `{
  collection: getWidgetSetting("collection")
}`;

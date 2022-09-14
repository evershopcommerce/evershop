import PropTypes from "prop-types"
import React from 'react';
import ProductList from '../../../components/product/list/List';

export default function FeaturedProducts({ products }) {
  return (
    <div className="pt-3">
      <div className="page-width">
        <h3 className="mt-3 mb-3 text-center uppercase h5 tracking-widest">Featured collection</h3>
        <ProductList products={products} />
      </div>
    </div>
  );
}

FeaturedProducts.propTypes = {
  products: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    productId: PropTypes.number,
    url: PropTypes.string,
    price: PropTypes.shape({
      regular: PropTypes.shape({
        value: PropTypes.float,
        text: PropTypes.string
      }),
      special: PropTypes.shape({
        value: PropTypes.float,
        text: PropTypes.string
      })
    }),
    image: PropTypes.shape({
      alt: PropTypes.string,
      listing: PropTypes.string
    })
  }))
}

export const layout = {
  areaId: "content",
  sortOrder: 5
}

export const query = `
  query query {
    products {
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
        listing
      }
    }
  }
`
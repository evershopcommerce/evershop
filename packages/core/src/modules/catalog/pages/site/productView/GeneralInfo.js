import PropTypes from 'prop-types';
import React from 'react';
import Area from '../../../../../lib/components/Area';
import './GeneralInfo.scss';

function Name({ name }) {
  return <h1 className="product-single-name">{name}</h1>;
}

Name.propTypes = {
  name: PropTypes.string.isRequired
};

function Price({ regular, special }) {

  return (
    <h4 className="product-single-price">
      {special.value === regular.value && (
        <div>
          <span className="sale-price">{regular.text}</span>
        </div>
      )}
      {special.value < regular.value && (
        <div>
          <span className="sale-price">{special.text}</span>
          {' '}
          <span className="regular-price">{regular.text}</span>
        </div>
      )}
    </h4>
  );
}

Price.propTypes = {
  regular: PropTypes.shape({
    value: PropTypes.number.isRequired,
    text: PropTypes.string.isRequired
  }),
  special: PropTypes.shape({
    value: PropTypes.number.isRequired,
    text: PropTypes.string.isRequired
  })
};

function Sku({ sku }) {
  return (
    <div className="product-single-sku text-textSubdued">
      <span>Sku</span>
      <span>: </span>
      {sku}
    </div>
  );
}

Sku.propTypes = {
  sku: PropTypes.string.isRequired
};

export default function GeneralInfo({ product }) {
  return (
    <Area
      id="productViewGeneralInfo"
      coreComponents={[
        {
          component: { default: Name },
          props: {
            name: product.name
          },
          sortOrder: 10,
          id: 'productSingleName'
        },
        {
          component: { default: Price },
          props: {
            regular: product.price.regular,
            special: product.price.special
          },
          sortOrder: 10,
          id: 'productSinglePrice'
        },
        {
          component: { default: Sku },
          props: {
            sku: product.sku
          },
          sortOrder: 20,
          id: 'productSingleSku'
        }
      ]}
    />
  );
}

export const layout = {
  areaId: "productPageMiddleRight",
  sortOrder: 10
};

export const query = `
  query Query {
    product (id: getContextValue('productId')) {
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
    }
  }`;
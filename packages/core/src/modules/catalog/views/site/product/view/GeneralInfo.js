import PropTypes from 'prop-types';
import React from 'react';
import Area from '../../../../../../lib/components/Area';
import { get } from '../../../../../../lib/util/get';
import './GeneralInfo.scss';
import { useSelector } from 'react-redux';

function Name({ name }) {
  return <h1 className="product-single-name">{name}</h1>;
}

Name.propTypes = {
  name: PropTypes.string.isRequired
};

function Price({ price, salePrice }) {
  const currency = useSelector((state) => get(state, 'pageData.currency', 'USD'));
  const language = useSelector((state) => get(state, 'pageData.language', 'en'));
  const formatedPrice = new Intl.NumberFormat(language, { style: 'currency', currency }).format(price);
  const formatedSalePrice = new Intl.NumberFormat(language, { style: 'currency', currency }).format(salePrice);

  return (
    <h4 className="product-single-price">
      {parseFloat(salePrice) === parseFloat(price) && (
        <div>
          <span className="sale-price">{formatedPrice}</span>
        </div>
      )}
      {parseFloat(salePrice) < parseFloat(price) && (
        <div>
          <span className="sale-price">{formatedSalePrice}</span>
          {' '}
          <span className="regular-price">{formatedPrice}</span>
        </div>
      )}
    </h4>
  );
}

Price.propTypes = {
  price: PropTypes.number.isRequired,
  salePrice: PropTypes.number.isRequired
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

export default function GeneralInfo() {
  const product = useSelector((state) => get(state, 'pageData.product', {}));
  return (
    <Area
      id="product_view_general_info"
      coreComponents={[
        {
          component: { default: Name },
          props: {
            name: product.name
          },
          sort_order: 10,
          id: 'product_single_name'
        },
        {
          component: { default: Price },
          props: {
            price: product.price,
            salePrice: product.price
          },
          sort_order: 10,
          id: 'product_single_price'
        },
        {
          component: { default: Sku },
          props: {
            sku: product.sku
          },
          sort_order: 20,
          id: 'product_single_sku'
        }
      ]}
    />
  );
}

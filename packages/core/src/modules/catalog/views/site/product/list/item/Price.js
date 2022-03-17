import PropTypes from 'prop-types';
import React from 'react';
import { useAppState } from '../../../../../../../lib/context/app';
import { get } from '../../../../../../../lib/util/get';

function Price({ price, salePrice }) {
  const context = useAppState();
  const currency = get(context, 'currency', 'USD');
  const language = get(context, 'language', 'en');
  const formatedPrice = new Intl.NumberFormat(language, { style: 'currency', currency }).format(price);
  const formatedSalePrice = new Intl.NumberFormat(language, { style: 'currency', currency }).format(salePrice);
  return (
    <div className="product-price-listing">
      {parseFloat(salePrice) === parseFloat(price) && (
        <div>
          <span className="sale-price font-semibold">{formatedPrice}</span>
        </div>
      )}
      {parseFloat(salePrice) < parseFloat(price) && (
        <div>
          <span className="sale-price text-critical font-semibold">{formatedSalePrice}</span>
          {' '}
          <span className="regular-price font-semibold">{formatedPrice}</span>
        </div>
      )}
    </div>
  );
}

Price.propTypes = {
  price: PropTypes.number.isRequired,
  salePrice: PropTypes.number.isRequired
};

export { Price };

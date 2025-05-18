import PropTypes from 'prop-types';
import React from 'react';


export function Price({ price, qty }) {
  return (
    <td>
      <div className="product-price">
        <span>
          {price} x {qty}
        </span>
      </div>
    </td>
  );
}

Price.propTypes = {
  price: PropTypes.string.isRequired,
  qty: PropTypes.number.isRequired
};

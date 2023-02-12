import PropTypes from 'prop-types';
import React from 'react';

export default function CheckoutButton({ action, cartId }) {
  const onClick = (e) => {
    e.preventDefault();
    // eslint-disable-next-line no-undef
    Fetch(action, false, 'POST', { cartId });
  };

  return (
    <tr>
      <td />
      <td>
        <div className="checkout-button">
          <a href="#" onClick={(e) => onClick(e)} className="btn btn-success">
            <span>Place order</span>
          </a>
        </div>
      </td>
    </tr>
  );
}

CheckoutButton.propTypes = {
  action: PropTypes.string.isRequired,
  cartId: PropTypes.string.isRequired
};

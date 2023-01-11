import React from 'react';
import PropTypes from 'prop-types';

export function Shipping({ method, cost }) {
  return (
    <div className="summary-row">
      <span>Shipping</span>
      <div>
        <div>{method}</div>
        <div>{cost}</div>
      </div>
    </div>
  );
}

Shipping.propTypes = {
  cost: PropTypes.string.isRequired,
  method: PropTypes.string.isRequired
};

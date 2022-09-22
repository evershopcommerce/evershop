import React from 'react';
import PropTypes from 'prop-types';

export function Shipping({ method, cost }) {
  if (!method) { return null; }

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
  cost: PropTypes.number,
  method: PropTypes.string
};

Shipping.defaultProps = {
  cost: undefined,
  method: undefined
};

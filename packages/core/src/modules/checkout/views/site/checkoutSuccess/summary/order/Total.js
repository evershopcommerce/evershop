import React from 'react';
import PropTypes from 'prop-types';

export function Total({ total }) {
  return (
    <div className="summary-row grand-total">
      <span className="self-center font-bold">Total</span>
      <div>
        <div />
        <div className="grand-total-value">{total}</div>
      </div>
    </div>
  );
}

Total.propTypes = {
  total: PropTypes.number.isRequired
};

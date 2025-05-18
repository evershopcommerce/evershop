import PropTypes from 'prop-types';
import React from 'react';


export function Total({ total }) {
  return (
    <div className="summary-row">
      <span>Total</span>
      <div>
        <span />
        <div>{total}</div>
      </div>
    </div>
  );
}

Total.propTypes = {
  total: PropTypes.string.isRequired
};

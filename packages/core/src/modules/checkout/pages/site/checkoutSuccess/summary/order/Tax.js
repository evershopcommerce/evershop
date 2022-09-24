import React from 'react';
import PropTypes from 'prop-types';

export function Tax({ taxClass, amount }) {
  return (
    <div className="summary-row">
      <span>Tax</span>
      <div>
        <div>{taxClass || 'No Tax'}</div>
        <div>{amount}</div>
      </div>
    </div>
  );
}

Tax.propTypes = {
  amount: PropTypes.string,
  taxClass: PropTypes.string
};

Tax.defaultProps = {
  amount: undefined,
  taxClass: undefined
};

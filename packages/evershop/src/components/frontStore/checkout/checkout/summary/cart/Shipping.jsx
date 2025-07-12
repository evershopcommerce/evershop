import PropTypes from 'prop-types';
import React from 'react';
import { _ } from '../../../../../../lib/locale/translate/_.js';

export function Shipping({ method, cost }) {
  if (!method) {
    return null;
  }

  return (
    <div className="summary-row">
      <span>{_('Shipping')}</span>
      <div>
        <div>{method}</div>
        <div>{cost}</div>
      </div>
    </div>
  );
}

Shipping.propTypes = {
  cost: PropTypes.string,
  method: PropTypes.string
};

Shipping.defaultProps = {
  cost: undefined,
  method: undefined
};

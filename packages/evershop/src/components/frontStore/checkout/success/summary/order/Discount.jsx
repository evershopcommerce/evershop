import PropTypes from 'prop-types';
import React from 'react';
import { _ } from '../../../../../../lib/locale/translate/_.js';

export function Discount({ discount, code }) {
  if (!discount) {
    return null;
  }

  return (
    <div className="summary-row">
      <span>{_('Discount')}</span>
      <div>
        <div>{code}</div>
        <div>{discount}</div>
      </div>
    </div>
  );
}

Discount.propTypes = {
  code: PropTypes.string,
  discount: PropTypes.string
};

Discount.defaultProps = {
  code: undefined,
  discount: undefined
};

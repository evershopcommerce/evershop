import PropTypes from 'prop-types';
import React from 'react';
import { _ } from '../../../../../../lib/locale/translate/_.js';

export function Subtotal({ count, total }) {
  return (
    <div className="summary-row">
      <span>{_('Sub total')}</span>
      <div>
        <div>{_('${count} items', { count })}</div>
        <div>{total}</div>
      </div>
    </div>
  );
}

Subtotal.propTypes = {
  count: PropTypes.number.isRequired,
  total: PropTypes.string.isRequired
};

import React from 'react';
import PropTypes from 'prop-types';
import { _ } from '@evershop/evershop/src/lib/locale/translate';

export function Tax({ taxClass, amount }) {
  return (
    <div className="summary-row">
      <span>{_('Tax')}</span>
      <div>
        <div>{taxClass}</div>
        <div>{amount}</div>
      </div>
    </div>
  );
}

Tax.propTypes = {
  amount: PropTypes.string.isRequired,
  taxClass: PropTypes.string.isRequired
};

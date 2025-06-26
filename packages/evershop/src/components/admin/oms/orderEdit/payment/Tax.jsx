import PropTypes from 'prop-types';
import React from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';

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

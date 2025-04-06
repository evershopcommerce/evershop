import React from 'react';
import PropTypes from 'prop-types';
import { _ } from '@evershop/evershop/src/lib/locale/translate/index.js';

export function Tax({ amount }) {
  return (
    <div className="summary-row flex justify-between">
      <span>{_('Tax')}</span>
      <div>
        <div />
        <div>{amount}</div>
      </div>
    </div>
  );
}

Tax.propTypes = {
  amount: PropTypes.string
};

Tax.defaultProps = {
  amount: undefined
};

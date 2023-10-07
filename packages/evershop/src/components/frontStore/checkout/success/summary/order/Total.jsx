import React from 'react';
import PropTypes from 'prop-types';
import { _ } from '@evershop/evershop/src/lib/locale/translate';

export function Total({ total, taxAmount, displayCheckoutPriceIncludeTax }) {
  return (
    <div className="summary-row grand-total">
      {(displayCheckoutPriceIncludeTax && (
        <div>
          <div>
            <div className="font-bold">
              <span>{_('Total')}</span>
            </div>
            <div>
              <span className="italic">
                ({_('Inclusive of tax ${taxAmount}', { taxAmount })})
              </span>
            </div>
          </div>
        </div>
      )) || <span className="self-center font-bold">{_('Total')}</span>}
      <div>
        <div />
        <div className="grand-total-value">{total}</div>
      </div>
    </div>
  );
}

Total.propTypes = {
  total: PropTypes.number.isRequired,
  taxAmount: PropTypes.number.isRequired,
  displayCheckoutPriceIncludeTax: PropTypes.bool.isRequired
};

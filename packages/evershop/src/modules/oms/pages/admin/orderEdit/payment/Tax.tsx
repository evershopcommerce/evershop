import React from 'react';
import { _ } from '../../../../../../lib/locale/translate/_.js';

interface TaxProps {
  taxClass: string;
  amount: string;
}

export function Tax({ taxClass, amount }: TaxProps) {
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

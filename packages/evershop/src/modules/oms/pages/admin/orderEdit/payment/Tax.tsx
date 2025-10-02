import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

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

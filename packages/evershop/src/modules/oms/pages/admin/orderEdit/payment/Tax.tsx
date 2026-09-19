import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface TaxProps {
  taxClass: string;
  amount: string;
}

export function Tax({ taxClass, amount }: TaxProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-muted-foreground min-w-[8.75rem]">
        {_('Tax')}
      </span>
      <div className="flex-1 flex items-start justify-between gap-2">
        <div className="text-sm text-muted-foreground">{taxClass}</div>
        <div className="font-semibold text-sm">{amount}</div>
      </div>
    </div>
  );
}

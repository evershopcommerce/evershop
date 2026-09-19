import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface ShippingProps {
  method: string;
  cost: string;
}

export function Shipping({ method, cost }: ShippingProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-muted-foreground min-w-[8.75rem]">
        {_('Shipping')}
      </span>
      <div className="flex-1 flex items-start justify-between gap-2">
        <div className="text-sm text-muted-foreground">{method}</div>
        <div className="font-semibold text-sm">{cost}</div>
      </div>
    </div>
  );
}

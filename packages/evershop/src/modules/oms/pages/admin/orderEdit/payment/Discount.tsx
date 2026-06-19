import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface DiscountProps {
  discount?: string;
  code?: string;
}

export function Discount({ discount, code }: DiscountProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-muted-foreground min-w-[8.75rem]">
        {_('Discount')}
      </span>
      <div className="flex-1 flex items-start justify-between gap-2">
        <div className="text-sm text-muted-foreground">{code}</div>
        <div className="font-semibold text-sm text-green-600 dark:text-green-400">
          {discount}
        </div>
      </div>
    </div>
  );
}

Discount.defaultProps = {
  code: undefined,
  discount: 0
};

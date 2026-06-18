import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface TotalProps {
  total: string;
}

export function Total({ total }: TotalProps) {
  return (
    <div className="flex items-start justify-between gap-4 pt-3 border-t border-border">
      <span className="text-base font-semibold min-w-[8.75rem]">
        {_('Total')}
      </span>
      <div className="flex-1 flex items-start justify-between gap-2">
        <span />
        <div className="text-base font-bold">{total}</div>
      </div>
    </div>
  );
}

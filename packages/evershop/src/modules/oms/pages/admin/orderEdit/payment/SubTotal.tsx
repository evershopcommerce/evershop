import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface SubTotalProps {
  count: number;
  total: string;
}

export function SubTotal({ count, total }: SubTotalProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-muted-foreground min-w-[8.75rem]">
        {_('Subtotal')}
      </span>
      <div className="flex-1 flex items-start justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          {_('${count} items', { count: String(count) })}
        </div>
        <div className="font-semibold text-sm">{total}</div>
      </div>
    </div>
  );
}

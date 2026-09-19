import { TableCell } from '@components/common/ui/Table.js';
import React from 'react';

interface PriceProps {
  price: string;
  qty: number;
}

export function Price({ price, qty }: PriceProps) {
  return (
    <TableCell className="w-32 whitespace-nowrap">
      <div className="product-price">
        <span>
          {price} x {qty}
        </span>
      </div>
    </TableCell>
  );
}

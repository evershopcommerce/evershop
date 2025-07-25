import React from 'react';

interface SubTotalProps {
  count: number;
  total: string;
}

export function SubTotal({ count, total }: SubTotalProps) {
  return (
    <div className="summary-row">
      <span>Subtotal</span>
      <div>
        <div>{count} items</div>
        <div>{total}</div>
      </div>
    </div>
  );
}

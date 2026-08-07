import React from 'react';

interface TotalProps {
  total: string;
}

export function Total({ total }: TotalProps) {
  return (
    <div className="summary-row">
      <span>Total</span>
      <div>
        <span />
        <div>{total}</div>
      </div>
    </div>
  );
}

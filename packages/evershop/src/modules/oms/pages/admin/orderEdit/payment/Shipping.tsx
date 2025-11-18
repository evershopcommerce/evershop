import React from 'react';

interface ShippingProps {
  method: string;
  cost: string;
}

export function Shipping({ method, cost }: ShippingProps) {
  return (
    <div className="summary-row">
      <span>Shipping</span>
      <div>
        <div>{method}</div>
        <div>{cost}</div>
      </div>
    </div>
  );
}

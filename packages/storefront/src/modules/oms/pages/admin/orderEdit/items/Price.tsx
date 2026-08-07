import React from 'react';

interface PriceProps {
  price: string;
  qty: number;
}

export function Price({ price, qty }: PriceProps) {
  return (
    <td>
      <div className="product-price">
        <span>
          {price} x {qty}
        </span>
      </div>
    </td>
  );
}

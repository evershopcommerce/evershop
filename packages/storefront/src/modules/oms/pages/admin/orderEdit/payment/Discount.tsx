import React from 'react';

interface DiscountProps {
  discount?: string;
  code?: string;
}

export function Discount({ discount, code }: DiscountProps) {
  return (
    <div className="summary-row">
      <span>Discount</span>
      <div>
        <div>{code}</div>
        <div>{discount}</div>
      </div>
    </div>
  );
}

Discount.defaultProps = {
  code: undefined,
  discount: 0
};

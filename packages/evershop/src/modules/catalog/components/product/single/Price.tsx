import React from 'react';

interface PriceProps {
  regular: {
    value: number;
    text: string;
  };
  special: {
    value: number;
    text: string;
  };
}
export function Price({ regular, special }: PriceProps) {
  return (
    <h4 className="product-single-price">
      {special.value === regular.value && (
        <div>
          <span className="sale-price">{regular.text}</span>
        </div>
      )}
      {special.value < regular.value && (
        <div>
          <span className="sale-price">{special.text}</span>{' '}
          <span className="regular-price">{regular.text}</span>
        </div>
      )}
    </h4>
  );
}

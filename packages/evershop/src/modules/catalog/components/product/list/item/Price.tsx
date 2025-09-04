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
const Price: React.FC<PriceProps> = ({ regular, special }) => {
  return (
    <div className="product-price-listing">
      {regular.value === special.value && (
        <div>
          <span className="sale-price font-semibold">{regular.text}</span>
        </div>
      )}
      {special.value < regular.value && (
        <div>
          <span className="sale-price text-critical font-semibold">
            {special.text}
          </span>{' '}
          <span className="regular-price font-semibold">{regular.text}</span>
        </div>
      )}
    </div>
  );
};

export { Price };

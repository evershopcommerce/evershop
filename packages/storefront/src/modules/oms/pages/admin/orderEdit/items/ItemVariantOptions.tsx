import React from 'react';

interface ItemVariantOptionsProps {
  options?: Array<{
    attributeName: string;
    optionText: string;
  }>;
}

export function ItemVariantOptions({ options = [] }: ItemVariantOptionsProps) {
  if (!Array.isArray(options) || !options || options.length === 0) {
    return null;
  }

  return (
    <div className="cart-item-variant-options mt-2">
      <ul>
        {options.map((o, i) => (
          <li key={i}>
            <span className="attribute-name font-semibold">
              {o.attributeName}:{' '}
            </span>
            <span>{o.optionText}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

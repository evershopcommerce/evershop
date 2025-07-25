import React from 'react';

interface ItemVariantOptionsProps {
  options?: Array<{
    attribute_name: string;
    option_text: string;
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
              {o.attribute_name}:{' '}
            </span>
            <span>{o.option_text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

import React from 'react';
import { useProduct } from '@components/frontStore/product/productContext.js';
import Area from '@components/common/Area.js';

export const ProductAttributes = () => {
  const { attributes, sku } = useProduct();
  const list = attributes
    ? [
        { attributeCode: 'sku', attributeName: 'SKU', optionText: sku },
        ...attributes
      ]
    : [];
  if (!list || list.length === 0) {
    return null;
  }

  return (
    <>
      <Area id="productAttributesBefore" noOuter />
      <div className="product__single__attributes py-3">
        <ul className="list-none">
          {list.map((attribute) => (
            <li key={attribute.attributeCode} className="py-1">
              <strong>{attribute.attributeName}: </strong>{' '}
              <span>{attribute.optionText}</span>
            </li>
          ))}
        </ul>
      </div>
      <Area id="productAttributesAfter" noOuter />
    </>
  );
};

import Area from '@components/common/Area.js';
import { useProduct } from '@components/frontStore/catalog/ProductContext.js';
import React from 'react';

export const ProductSingleAttributes = () => {
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
      <div className="product__single__attributes py-4">
        <ul className="list-none space-y-1.5 text-[0.9375rem]">
          {list.map((attribute) => (
            <li key={attribute.attributeCode} className="flex gap-2">
              <span className="text-textSubdued">
                {attribute.attributeName}
              </span>
              <span className="text-secondary">{attribute.optionText}</span>
            </li>
          ))}
        </ul>
      </div>
      <Area id="productAttributesAfter" noOuter />
    </>
  );
};

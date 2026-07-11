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
      {/* Re-skin (2026-07-10): a clean divided spec list (was a plain <ul>).
          A <dl> of grid rows avoids the global bordered-<table> style. */}
      <dl className="product__single__attributes mt-5 border-t border-border text-sm">
        {list.map((attribute) => (
          <div
            key={attribute.attributeCode}
            className="grid grid-cols-[9rem_1fr] gap-4 border-b border-border py-2.5"
          >
            <dt className="font-medium">{attribute.attributeName}</dt>
            <dd className="text-muted-foreground">{attribute.optionText}</dd>
          </div>
        ))}
      </dl>
      <Area id="productAttributesAfter" noOuter />
    </>
  );
};

import Area from '@components/common/Area.js';
import { Editor } from '@components/common/Editor.js';
import { useProduct } from '@components/frontStore/catalog/ProductContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export const ProductSingleDescription = () => {
  const { description } = useProduct();

  return (
    <>
      <Area id="productDescriptionBefore" noOuter />
      <div className="product__single__description mt-8">
        <h3>{_('Product Description')}</h3>
        <Editor rows={description} />
      </div>
      <Area id="productDescriptionAfter" noOuter />
    </>
  );
};

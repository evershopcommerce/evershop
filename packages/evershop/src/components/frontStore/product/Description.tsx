import React from 'react';
import { Editor } from '@components/common/Editor.js';
import { useProduct } from '@components/frontStore/product/productContext.js';
import Area from '@components/common/Area.js';
import { _ } from '../../../lib/locale/translate/_.js';

export const ProductDescription = () => {
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

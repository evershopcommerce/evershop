import Area from '@components/common/Area.js';
import { Editor } from '@components/common/Editor.js';
import { useProduct } from '@components/frontStore/catalog/ProductContext.js';
import { _ } from '@storefront/core/lib/locale/translate/_';
import React from 'react';

export const ProductSingleDescription = () => {
  const { description } = useProduct();

  return (
    <>
      <Area id="productDescriptionBefore" noOuter />
      <div className="product__single__description mt-16 border-t border-divider pt-10">
        <h3 className="mb-4">{_('Product Description')}</h3>
        <div className="max-w-3xl text-secondary">
          <Editor rows={description} />
        </div>
      </div>
      <Area id="productDescriptionAfter" noOuter />
    </>
  );
};

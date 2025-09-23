import Area from '@components/common/Area.js';
import { useProduct } from '@components/frontStore/catalog/productContext.js';
import React from 'react';
import { _ } from '../../../lib/locale/translate/_.js';

export const ProductSingleSku = () => {
  const { sku } = useProduct();
  return (
    <>
      <Area id="productSkuBefore" noOuter />
      <div className="product__single__sku">{_('SKU: ${sku}', { sku })}</div>
      <Area id="productSkuAfter" noOuter />
    </>
  );
};

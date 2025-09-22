import React from 'react';
import { useProduct } from '@components/frontStore/product/productContext.js';
import Area from '@components/common/Area.js';
import { _ } from '../../../lib/locale/translate/_.js';

export const ProductSku = () => {
  const { sku } = useProduct();
  return (
    <>
      <Area id="productSkuBefore" noOuter />
      <div className="product__single__sku">{_('SKU: ${sku}', { sku })}</div>
      <Area id="productSkuAfter" noOuter />
    </>
  );
};

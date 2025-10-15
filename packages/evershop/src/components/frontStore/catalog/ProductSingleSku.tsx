import Area from '@components/common/Area.js';
import { useProduct } from '@components/frontStore/catalog/ProductContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

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

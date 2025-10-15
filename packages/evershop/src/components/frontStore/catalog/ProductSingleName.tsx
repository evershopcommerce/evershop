import Area from '@components/common/Area.js';
import { useProduct } from '@components/frontStore/catalog/ProductContext.js';
import React from 'react';

export const ProductSingleName = () => {
  const { name } = useProduct();
  return (
    <>
      <Area id="productNameBefore" noOuter />
      <h1 className="product__single__name capitalize">{name}</h1>
      <Area id="productNameAfter" noOuter />
    </>
  );
};

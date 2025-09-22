import React from 'react';
import { useProduct } from '@components/frontStore/product/productContext.js';
import Area from '@components/common/Area.js';

export const ProductName = () => {
  const { name } = useProduct();
  return (
    <>
      <Area id="productNameBefore" noOuter />
      <h1 className="product__single__name capitalize">{name}</h1>
      <Area id="productNameAfter" noOuter />
    </>
  );
};

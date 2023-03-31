import React from 'react';
import Area from '@components/common/Area';

export default function ProductPageLayout() {
  return (
    <div className="product-detail">
      <Area id="productPageTop" className="product-page-top" />
      <div className="product-page-middle page-width">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Area id="productPageMiddleLeft" />
          <Area id="productPageMiddleRight" />
        </div>
      </div>
      <Area id="productPageBottom" className="product-page-top" />
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

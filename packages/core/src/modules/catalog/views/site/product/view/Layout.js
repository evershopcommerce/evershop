import React from 'react';
import Area from '../../../../../../lib/components/Area';
import { getComponents } from '../../../../../../lib/components/getComponents';

export default function ProductPageLayout() {
  return (
    <div className="product-detail">
      <Area
        id="productPageTop"
        className="product-page-top"
        components={getComponents()}
      />
      <div className="product-page-middle page-width">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Area
            id="productPageMiddleLeft"
            components={getComponents()}
          />
          <Area
            id="productPageMiddleRight"
            components={getComponents()}
          />
        </div>
      </div>
      <Area
        id="productPageBottom"
        className="product-page-top"
        components={getComponents()}
      />
    </div>
  );
}

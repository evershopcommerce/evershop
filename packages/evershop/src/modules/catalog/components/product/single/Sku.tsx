import React from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';

export function Sku({ sku }: { sku: string }) {
  return (
    <div className="product-single-sku text-textSubdued">
      <span className="sku-label">{_('Sku')}</span>
      <span className="sku-separator">: </span>
      <span className="sku-value">{sku}</span>
    </div>
  );
}

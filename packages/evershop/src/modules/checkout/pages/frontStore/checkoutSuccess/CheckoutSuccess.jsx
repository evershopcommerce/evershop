import React from 'react';
import Area from '@components/common/Area';
import './CheckoutSuccess.scss';

export default function CheckoutSuccessPage() {
  return (
    <div className="page-width grid grid-cols-1 md:grid-cols-2 gap-12">
      <Area id="checkoutSuccessPageLeft" />
      <Area id="checkoutSuccessPageRight" />
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

import React from 'react';
import { _ } from '@evershop/evershop/src/lib/locale/translate';
import './MainBanner.scss';

export default function MainBanner() {
  const text = _('Discount ${discount} For All Orders Over ${price}', {
    discount: '20%',
    price: '$2000'
  });
  return (
    <div className="main-banner-home flex items-center">
      <div className="container grid grid-cols-1 md:grid-cols-2 gap-2">
        <div />
        <div className="text-center md:text-left px-2 ">
          <h2 className="h1 ">{text}</h2>
          <p>
            Use coupon code
            <span className="font-bold">DISCOUNT20</span>
          </p>
          <p>{_('Use coupon ${coupon}', { coupon: 'DISCOUNT20' })}</p>
          <p />
        </div>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 1
};

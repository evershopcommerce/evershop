import React from 'react';
import Button from '../../../components/frontStore/Button';
import './MainBanner.scss';

export default function MainBanner() {
  return (
    <div className="main-banner-home flex items-center">
      <div className="container grid grid-cols-1 md:grid-cols-2 gap-2">
        <div></div>
        <div className='text-center md:text-left px-2 '>
          <h2 className="h1 ">Discount <span className='text-white'>20%</span> For All Orders Over $2000</h2>
          <p>Use coupon code <span className="font-bold">DISCOUNT20</span></p>
          <Button url="/category/women" title="SHOP NOW" variant="primary" />
        </div>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 1
};
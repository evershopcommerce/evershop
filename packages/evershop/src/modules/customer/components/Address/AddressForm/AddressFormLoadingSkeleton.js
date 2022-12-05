import React from 'react';
import './AddressFormLoadingSkeleton.scss';

export const AddressFormLoadingSkeleton = () => {
  return <div className='address-loading-skeleton'>
    <div className='grid gap-2 grid-cols-2'>
      <div class="skeleton"></div>
      <div class="skeleton"></div>
    </div>
    <div class="skeleton"></div>
    <div class="skeleton"></div>
    <div class="skeleton"></div>
    <div className='grid gap-2 grid-cols-2'>
      <div class="skeleton"></div>
      <div class="skeleton"></div>
    </div>
  </div>
}
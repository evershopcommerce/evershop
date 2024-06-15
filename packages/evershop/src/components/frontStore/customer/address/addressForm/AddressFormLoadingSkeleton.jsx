import React from 'react';
import './AddressFormLoadingSkeleton.scss';

export function AddressFormLoadingSkeleton() {
  return (
    <div className="address-loading-skeleton">
      <div className="grid gap-8 grid-cols-2">
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="grid gap-8 grid-cols-2">
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
    </div>
  );
}

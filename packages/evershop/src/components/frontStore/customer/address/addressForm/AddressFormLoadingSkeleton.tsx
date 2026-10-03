import React from 'react';
import './AddressFormLoadingSkeleton.scss';

/**
 * Shown while the country list or the country's schema is in flight. It knows
 * nothing about fields on purpose: the same placeholder serves every country,
 * so the server and the first client render agree (no hydration mismatch).
 */
export function AddressFormLoadingSkeleton() {
  return (
    <div className="address-loading-skeleton" role="status" aria-busy="true">
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="grid gap-5 grid-cols-2">
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
      <div className="skeleton" />
    </div>
  );
}

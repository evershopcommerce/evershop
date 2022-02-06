import React from 'react';
import { useAppState } from '../../../../lib/context/app';
import { get } from '../../../../lib/util/get';

export default function MiniCart({ cartUrl, checkoutUrl }) {
  const context = useAppState();
  const items = get(context, 'cart.items', []);

  return (
    <div className="mini-cart-wrapper self-center">
      <a className="mini-cart-icon" href={cartUrl}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        {items.length > 0 && <span>{items.length}</span>}
      </a>
    </div>
  );
}

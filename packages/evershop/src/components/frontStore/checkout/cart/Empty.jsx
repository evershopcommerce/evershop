import React from 'react';
import { useAppState } from '@components/common/context/app';
import Button from '@components/common/form/Button';
import { _ } from '@evershop/evershop/src/lib/locale/translate';

const { get } = require('@evershop/evershop/src/lib/util/get');

export function Empty() {
  const items = get(useAppState(), 'cart.items', []);
  if (items.length > 0) {
    return null;
  }
  return (
    <div className="empty-shopping-cart w-100" style={{ marginTop: '150px' }}>
      <div>
        <div className="text-center">
          <h2>{_('Shopping cart')}</h2>
        </div>
        <div className="mt-2 text-center">
          <span>{_('Your cart is empty!')}</span>
        </div>
        <div className="flex justify-center mt-2">
          <Button
            url="/"
            title={
              <span className="flex space-x-1">
                <span className="self-center">{_('CONTINUE SHOPPING')}</span>{' '}
                <svg
                  className="self-center"
                  style={{ width: '2.5rem', height: '2.5rem' }}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </span>
            }
          />
        </div>
      </div>
    </div>
  );
}

import Button from '@components/common/Button.js';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';
import { _ } from '@storefront/core/lib/locale/translate/_';
import React from 'react';

export function ShoppingCartEmpty() {
  return (
    <div className="empty-shopping-cart flex flex-col items-center justify-center py-24 text-center">
      <ShoppingBagIcon
        width={56}
        height={56}
        className="mb-6 text-borderStrong"
      />
      <h2 className="shopping-cart-heading mb-3">{_('Your cart is empty')}</h2>
      <p className="mb-8 max-w-sm text-textSubdued">
        {_('Once you add something to your cart, it will appear here.')}
      </p>
      <Button
        url="/"
        variant="primary"
        title={_('CONTINUE SHOPPING')}
        className="px-8 py-3.5"
      />
    </div>
  );
}

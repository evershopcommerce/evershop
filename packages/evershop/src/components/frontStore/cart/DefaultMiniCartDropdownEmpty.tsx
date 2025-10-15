import { Area } from '@components/common/Area.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';
import React from 'react';

export const DefaultMiniCartDropdownEmpty: React.FC<{
  setIsDropdownOpen: (isOpen: boolean) => void;
}> = ({ setIsDropdownOpen }) => (
  <div className="minicart__empty p-8 text-center">
    <Area id="miniCartEmptyBefore" noOuter />
    <ShoppingBagIcon
      width={48}
      height={48}
      className="mx-auto text-gray-300 mb-4"
    />
    <p className="text-gray-500 mb-4">{_('Your cart is empty')}</p>
    <button
      type="button"
      onClick={() => setIsDropdownOpen(false)}
      className="continue__shopping__button text-blue-600 hover:text-blue-700 font-medium"
    >
      {_('Continue Shopping')}
    </button>
    <Area id="miniCartEmptyAfter" noOuter />
  </div>
);

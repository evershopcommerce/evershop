import { Area } from '@components/common/Area.js';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';
import { _ } from '@storefront/core/lib/locale/translate/_';
import React from 'react';

export const DefaultMiniCartDropdownEmpty: React.FC<{
  setIsDropdownOpen: (isOpen: boolean) => void;
}> = ({ setIsDropdownOpen }) => (
  <div className="minicart__empty flex flex-col items-center justify-center px-8 py-16 text-center">
    <Area id="miniCartEmptyBefore" noOuter />
    <ShoppingBagIcon
      width={48}
      height={48}
      className="mx-auto text-borderStrong mb-4"
    />
    <p className="text-textSubdued mb-5">{_('Your cart is empty')}</p>
    <button
      type="button"
      onClick={() => setIsDropdownOpen(false)}
      className="continue__shopping__button rounded-full border border-borderStrong px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-surfaceSubdued"
    >
      {_('Continue Shopping')}
    </button>
    <Area id="miniCartEmptyAfter" noOuter />
  </div>
);

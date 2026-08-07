import { Area } from '@components/common/Area.js';
import { CartData } from '@components/frontStore/cart/CartContext.js';
import { CartItems } from '@components/frontStore/cart/CartItems.js';
import { CartTotalSummary } from '@components/frontStore/cart/CartTotalSummary.js';
import { DefaultMiniCartDropdownEmpty } from '@components/frontStore/cart/DefaultMiniCartDropdownEmpty.js';
import { DefaultMiniCartItemList } from '@components/frontStore/cart/DefaultMiniCartItemList.js';
import { _ } from '@storefront/core/lib/locale/translate/_';
import React, { useEffect, useRef } from 'react';

export const DefaultMiniCartDropdown: React.FC<{
  cart: CartData | null;
  isOpen: boolean;
  onClose: () => void;
  cartUrl?: string;
  dropdownPosition?: 'left' | 'right';
  setIsDropdownOpen: (isOpen: boolean) => void;
}> = ({
  cart,
  isOpen,
  onClose,
  cartUrl,
  dropdownPosition = 'right',
  setIsDropdownOpen
}) => {
  const totalQty = cart?.totalQty || 0;
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';

      setTimeout(() => {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        }
      }, 100);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-primary/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      ></div>
      <div
        className={`minicart__dropdown fixed top-0 bottom-0 w-full max-w-md bg-white p-6 z-50 shadow-overlay transition-transform duration-300 ease-smooth transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } ${dropdownPosition === 'left' ? 'left-0' : 'right-0'}`}
        role="dialog"
        aria-modal="true"
        aria-label={_('Shopping Cart')}
      >
        <div className="minicart__dropdown__header flex justify-between items-center mb-6 border-b border-divider pb-4">
          <h3 className="minicart__heading text-2xl">
            {_('Your Cart')}
          </h3>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-textSubdued hover:bg-surfaceSubdued hover:text-primary transition-colors"
            aria-label={_('Close cart')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        {totalQty === 0 ? (
          <DefaultMiniCartDropdownEmpty setIsDropdownOpen={setIsDropdownOpen} />
        ) : (
          <div
            className="minicart__items__container flex flex-col justify-between h-full"
            style={{ height: 'calc(100vh - 150px)' }}
          >
            <Area id="miniCartItemsBefore" noOuter />
            <div className="overflow-y-auto mb-8">
              <CartItems>
                {({ items, loading }) => (
                  <DefaultMiniCartItemList items={items} loading={loading} />
                )}
              </CartItems>
            </div>
            <Area id="miniCartItemsAfter" noOuter />
            <Area id="miniCartSummaryBefore" noOuter />
            <CartTotalSummary>
              {({ total }) => (
                <>
                  <div className="minicart__summary flex justify-between items-center mb-3">
                    <span className="font-medium text-secondary">
                      {_('Subtotal')}
                    </span>
                    <span className="font-semibold text-lg text-primary">
                      {total || '—'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (cartUrl) {
                        window.location.href = cartUrl;
                      }
                    }}
                    className="minicart__viewcart__button w-full bg-primary text-white py-4 px-4 rounded-full hover:bg-primaryHover transition-colors font-semibold"
                  >
                    {_('View Cart (${totalQty})', {
                      totalQty: totalQty.toString()
                    })}
                  </button>
                </>
              )}
            </CartTotalSummary>
            <Area id="miniCartSummaryAfter" noOuter />
          </div>
        )}
      </div>
    </>
  );
};

/* eslint-disable react/prop-types */
import Area from '@components/common/Area.js';
import { Image } from '@components/common/Image.js';
import { ProductNoThumbnail } from '@components/common/ProductNoThumbnail.js';
import {
  useCartState,
  CartData,
  CartSyncTrigger
} from '@components/frontStore/cart/cartContext.js';
import {
  CartItems,
  ItemProps,
  SkeletonValue
} from '@components/frontStore/cart/CartItems.js';
import { CartTotalSummary } from '@components/frontStore/cart/CartTotalSummary.js';
import { ItemQuantity } from '@components/frontStore/cart/ItemQuantity.js';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';
import React, { ReactNode, useCallback, useState, useEffect } from 'react';
import { _ } from '../../../lib/locale/translate/_.js';

interface MiniCartProps {
  cartUrl?: string;
  dropdownPosition?: 'left' | 'right';
  showItemCount?: boolean;
  renderCartIcon?: (props: {
    totalQty: number;
    onClick: () => void;
    isOpen: boolean;
  }) => ReactNode;
  renderCartDropdown?: (props: {
    cart: CartData | null;
    onClose: () => void;
    cartUrl?: string;
  }) => ReactNode;
  renderCartItems?: (props: {
    items: ItemProps[];
    loading: boolean;
    isEmpty: boolean;
    totalItems: number;
    onRemoveItem: (itemId: string) => Promise<void>;
    SkeletonCartItem: React.FC;
    EmptyCart: React.FC<{ loading?: boolean }>;
    CartItemComponent: React.FC<{
      item: ItemProps;
      loading?: boolean;
      onRemoveItem?: (itemId: string) => Promise<void>;
    }>;
  }) => ReactNode;
  renderEmptyCart?: () => ReactNode;
  onItemRemove?: (itemId: string) => Promise<void> | void;
  className?: string;
  disabled?: boolean;
}

const CartItemComponent: React.FC<{
  item: ItemProps;
  loading?: boolean;
  onRemoveItem?: (itemId: string) => Promise<void>;
}> = ({ item, loading = false, onRemoveItem }) => {
  const handleRemove = async () => {
    if (onRemoveItem) {
      await onRemoveItem(item.id);
    }
  };

  return (
    <div className="flex justify-between items-center py-3 border-b gap-3">
      <div className="flex gap-4 items-center">
        <div className="flex gap-4 items-center">
          {item.thumbnail ? (
            <Image
              src={item.thumbnail}
              alt={item.name}
              className="object-cover rounded"
              width={100}
              height={100}
            />
          ) : (
            <ProductNoThumbnail width={100} height={100} />
          )}
        </div>
        <div className="min-w-0">
          <div className="mb-1">
            {item.url ? (
              <a
                href={item.url}
                className="font-medium text-gray-900 hover:text-blue-600"
              >
                {item.name}
              </a>
            ) : (
              <h3 className="font-medium text-gray-900">{item.name}</h3>
            )}
          </div>
          <div className="font-medium">
            <SkeletonValue>{item.price}</SkeletonValue>
          </div>
          {item.variantOptions && item.variantOptions.length > 0 && (
            <div className="text-sm text-gray-500">
              {item.variantOptions.map((option) => (
                <div key={option.attributeCode}>
                  {option.attributeName}: {option.optionText}
                </div>
              ))}
            </div>
          )}
          <ItemQuantity
            initialValue={item.qty}
            cartItemId={item.id}
            min={1}
            max={99}
          >
            {({ quantity, increase, decrease }) => (
              <div className="flex items-center">
                <button
                  onClick={decrease}
                  disabled={loading || quantity <= 1}
                  className="px-1 disabled:opacity-50 text-lg"
                >
                  −
                </button>
                <span className="min-w-[3rem] text-center">{quantity}</span>
                <button
                  onClick={increase}
                  disabled={loading}
                  className="disabled:opacity-50 text-lg"
                >
                  +
                </button>
              </div>
            )}
          </ItemQuantity>
          <div className="mt-2">
            <button
              onClick={handleRemove}
              disabled={loading}
              className="text-sm text-red-600 hover:underline disabled:opacity-50"
            >
              {_('Remove')}
            </button>
          </div>
        </div>
      </div>

      <div className="text-center">
        <div className="font-medium">
          <SkeletonValue loading={loading}>{item.lineTotal}</SkeletonValue>
        </div>
      </div>
    </div>
  );
};

const DefaultCartItems = ({
  items,
  loading,
  isEmpty,
  onRemoveItem
}: {
  items: ItemProps[];
  loading: boolean;
  isEmpty: boolean;
  totalItems: number;
  onRemoveItem: (itemId: string) => Promise<void>;
}) => {
  if (isEmpty) {
    return null; // The main MiniCart component will handle the empty state
  }
  return (
    <div>
      {items.map((item) => (
        <CartItemComponent
          key={item.id}
          item={item}
          loading={loading}
          onRemoveItem={onRemoveItem}
        />
      ))}
    </div>
  );
};

export function MiniCart({
  cartUrl = '/cart',
  dropdownPosition = 'right',
  showItemCount = true,
  renderCartIcon,
  renderCartDropdown,
  renderCartItems,
  renderEmptyCart,
  className = '',
  disabled = false
}: MiniCartProps) {
  const { data: cartData, syncStatus } = useCartState();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const cart = cartData;

  const handleCartClick = useCallback(() => {
    if (disabled) return;

    setIsDropdownOpen(!isDropdownOpen);
  }, [disabled, isDropdownOpen, cartUrl]);

  const handleDropdownClose = useCallback(() => {
    setIsDropdownOpen(false);
  }, []);

  useEffect(() => {
    if (syncStatus.synced && syncStatus.trigger === CartSyncTrigger.ADD_ITEM) {
      setIsDropdownOpen(true);
    }
  }, [syncStatus.synced, syncStatus.trigger]);

  // Default cart icon renderer
  const defaultCartIcon = (props: {
    totalQty: number;
    onClick: () => void;
    isOpen: boolean;
  }) => (
    <button
      type="button"
      onClick={props.onClick}
      disabled={disabled}
      className={`mini-cart-icon relative ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${props.isOpen ? 'active' : ''}`}
      aria-label={`Shopping cart with ${props.totalQty} items`}
    >
      {syncStatus.syncing ? (
        <div className="w-6 h-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-700"></div>
        </div>
      ) : (
        <ShoppingBagIcon
          width={24}
          height={24}
          className="text-gray-700 hover:text-gray-900 transition-colors"
        />
      )}
      {showItemCount && props.totalQty > 0 && !syncStatus.syncing && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
          {props.totalQty > 99 ? '99+' : props.totalQty}
        </span>
      )}
    </button>
  );

  // Default empty cart renderer
  const defaultEmptyCart = () => (
    <div className="p-8 text-center">
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
        className="text-blue-600 hover:text-blue-700 font-medium"
      >
        {_('Continue Shopping')}
      </button>
      <Area id="miniCartEmptyAfter" noOuter />
    </div>
  );

  const defaultCartDropdown = (props: {
    cart: CartData | null;
    onClose: () => void;
    cartUrl?: string;
  }) => {
    const totalQty = props.cart?.totalQty || 0;
    return (
      <div
        className={`minicart__dropdown fixed top-0 bottom-0 w-full md:w-1/3 bg-white border-x p-5 border-gray-200 z-50 ${
          dropdownPosition === 'left' ? 'right-0' : 'right-0'
        }`}
      >
        <div className="flex justify-between items-center mb-6 border-b pb-4 border-gray-200">
          <h3 className="font-medium text-2xl text-gray-900">
            {_('Your Cart')}
          </h3>
          <button
            type="button"
            onClick={props.onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close cart"
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
          renderEmptyCart ? (
            renderEmptyCart()
          ) : (
            defaultEmptyCart()
          )
        ) : (
          <div
            className="flex flex-col justify-between h-full"
            style={{ height: 'calc(100vh - 150px)' }}
          >
            <Area id="miniCartItemsBefore" noOuter />
            <div className="overflow-y-auto mb-8">
              <CartItems>{renderCartItems || DefaultCartItems}</CartItems>
            </div>
            <Area id="miniCartItemsAfter" noOuter />
            <Area id="miniCartSummaryBefore" noOuter />
            <CartTotalSummary>
              {({ total }) => (
                <>
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium text-gray-900">
                      {_('Subtotal')}:
                    </span>
                    <span className="font-semibold text-lg text-gray-900">
                      {total || '—'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (props.cartUrl) {
                        window.location.href = props.cartUrl;
                      }
                    }}
                    className="w-full bg-primary text-white py-4 px-4 rounded-full hover:bg-blue-700 transition-colors font-medium"
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
    );
  };

  return (
    <div className={`mini__cart__wrapper relative ${className}`}>
      {renderCartIcon
        ? renderCartIcon({
            totalQty: cart?.totalQty || 0,
            onClick: handleCartClick,
            isOpen: isDropdownOpen
          })
        : defaultCartIcon({
            totalQty: cart?.totalQty || 0,
            onClick: handleCartClick,
            isOpen: isDropdownOpen
          })}

      {isDropdownOpen &&
        (renderCartDropdown
          ? renderCartDropdown({
              cart,
              onClose: handleDropdownClose,
              cartUrl
            })
          : defaultCartDropdown({
              cart,
              onClose: handleDropdownClose,
              cartUrl
            }))}
    </div>
  );
}

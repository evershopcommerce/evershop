import Area from '@components/common/Area.js';
import {
  useCartState,
  useCartDispatch
} from '@components/common/context/cart.js';
import { Image } from '@components/common/Image.js';
import React from 'react';
import { _ } from '../../lib/locale/translate/_.js';
import { ItemQuantity } from '@components/frontStore/ItemQuantity.js';

export interface ItemProps {
  id: string;
  name: string;
  url: string;
  sku: string;
  variantOptions: {
    attributeCode: string;
    attributeName: string;
    optionText: string;
  }[];
  thumbnail?: string;
  price: string;
  qty: number;
  lineTotal: string;
  errors: string[];
}

const SkeletonImage: React.FC = () => (
  <div className="w-16 h-16 bg-gray-200 rounded animate-pulse" />
);

// Skeleton for individual values that preserves layout
const SkeletonValue: React.FC<{
  children: React.ReactNode;
  loading?: boolean;
  className?: string;
}> = ({ children, loading = false, className = '' }) => {
  if (!loading) {
    return <>{children}</>;
  }

  return (
    <span className={`relative ${className}`}>
      <span className="opacity-0">{children}</span>
      <span className="absolute inset-0 bg-gray-200 rounded animate-pulse" />
    </span>
  );
};

export const SkeletonCartItem: React.FC = () => (
  <div className="grid grid-cols-4 gap-4 p-4 border-b items-center">
    {/* PRODUCT Column */}
    <div className="flex gap-4 items-center">
      <SkeletonImage />
      <div className="space-y-2">
        <SkeletonValue loading={true}>
          <span className="font-medium">Sample Product Name Here</span>
        </SkeletonValue>
        <SkeletonValue loading={true}>
          <span className="text-sm text-gray-500">Size: S</span>
        </SkeletonValue>
        <SkeletonValue loading={true}>
          <span className="text-sm text-gray-500">Color: White</span>
        </SkeletonValue>
      </div>
    </div>

    {/* Custom Columns Area - Developers can add skeleton columns here */}
    <Area id="cartTableRowColumns" noOuter />

    {/* PRICE Column */}
    <div className="text-center">
      <SkeletonValue loading={true}>
        <span>$904.00</span>
      </SkeletonValue>
    </div>

    {/* QUANTITY Column */}
    <div className="flex justify-center">
      <div className="flex items-center border rounded">
        <span className="px-3 py-2">−</span>
        <SkeletonValue loading={true}>
          <span className="px-4 py-2 min-w-[3rem] text-center">1</span>
        </SkeletonValue>
        <span className="px-3 py-2">+</span>
      </div>
    </div>

    {/* TOTAL Column */}
    <div className="text-center">
      <SkeletonValue loading={true}>
        <span>$904.00</span>
      </SkeletonValue>
    </div>
  </div>
);

// Reusable cart table header component
const CartTableHeader: React.FC = () => (
  <div className="grid grid-cols-4 gap-4 p-4 border-b font-medium text-sm text-gray-700 uppercase tracking-wide">
    <div>{_('PRODUCT')}</div>
    <Area id="cartTableHeaderColumns" noOuter />
    <div className="text-center">{_('PRICE')}</div>
    <div className="text-center">{_('QUANTITY')}</div>
    <div className="text-center">{_('TOTAL')}</div>
  </div>
);

// Individual cart item component
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
    <div className="grid grid-cols-4 gap-4 p-4 border-b items-center">
      <Area id="cartItemBefore" item={item} noOuter />

      {/* PRODUCT Column */}
      <div className="flex gap-4 items-center">
        {/* Product Image */}
        <div className="flex-shrink-0">
          {item.thumbnail ? (
            <Image
              src={item.thumbnail}
              alt={item.name}
              className="w-16 h-16 object-cover rounded"
              width={80}
              height={80}
            />
          ) : (
            <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
              <span className="text-gray-400 text-xs">{_('No Image')}</span>
            </div>
          )}
        </div>

        <Area id="cartItemAfterImage" item={item} noOuter />

        {/* Product Details */}
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

          <Area id="cartItemAfterName" item={item} noOuter />

          {/* Variant Options */}
          {item.variantOptions && item.variantOptions.length > 0 && (
            <div className="text-sm text-gray-500">
              {item.variantOptions.map((option) => (
                <div key={option.attributeCode}>
                  {option.attributeName}: {option.optionText}
                </div>
              ))}
            </div>
          )}

          <Area id="cartItemAfterVariants" item={item} noOuter />

          {/* Remove Button */}
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

      {/* Custom Columns Area - Developers can add columns here */}
      <Area id="cartTableRowColumns" item={item} noOuter />

      {/* PRICE Column */}
      <div className="text-center">
        <div className="font-medium">
          <SkeletonValue loading={loading}>{item.price}</SkeletonValue>
        </div>
      </div>

      {/* QUANTITY Column */}
      <div className="flex justify-center">
        <ItemQuantity
          initialValue={item.qty}
          cartItemId={item.id}
          min={1}
          max={99}
        >
          {({ quantity, increase, decrease }) => (
            <div className="flex items-center border rounded">
              <button
                onClick={decrease}
                disabled={loading || quantity <= 1}
                className="px-3 py-2 hover:bg-gray-100 disabled:opacity-50 text-lg"
              >
                −
              </button>
              <span className="px-4 py-2 min-w-[3rem] text-center">
                {quantity}
              </span>
              <button
                onClick={increase}
                disabled={loading}
                className="px-3 py-2 hover:bg-gray-100 disabled:opacity-50 text-lg"
              >
                +
              </button>
            </div>
          )}
        </ItemQuantity>
      </div>

      {/* TOTAL Column */}
      <div className="text-center">
        <div className="font-medium">
          <SkeletonValue loading={loading}>{item.lineTotal}</SkeletonValue>
        </div>
      </div>

      <Area id="cartItemAfterQuantity" item={item} noOuter />
      <Area id="cartItemAfterPrice" item={item} noOuter />

      {/* Item Errors */}
      {!loading && item.errors && item.errors.length > 0 && (
        <div className="col-span-4 mt-2 text-sm text-red-600">
          {item.errors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}

      <Area id="cartItemAfterErrors" item={item} noOuter />
      <Area id="cartItemAfter" item={item} noOuter />
    </div>
  );
};

// Empty cart component
const EmptyCart: React.FC<{ loading?: boolean }> = ({ loading = false }) => {
  return (
    <div className="text-center py-8 text-gray-500">
      <p className="text-lg">
        <SkeletonValue loading={loading}>
          {_('Your cart is empty')}
        </SkeletonValue>
      </p>
      <p className="text-sm mt-2">
        <SkeletonValue loading={loading}>
          {_('Add some items to get started')}
        </SkeletonValue>
      </p>
    </div>
  );
};

// Default cart items component
const DefaultCartItems: React.FC<{
  items: ItemProps[];
  loading: boolean;
  onRemoveItem: (itemId: string) => Promise<void>;
}> = ({ items, loading, onRemoveItem }) => {
  if (loading && items.length === 0) {
    return (
      <div>
        <CartTableHeader />
        <SkeletonCartItem />
        <SkeletonCartItem />
        <SkeletonCartItem />
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyCart loading={loading} />;
  }

  return (
    <div>
      <CartTableHeader />
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

interface CartItemsProps {
  children?: (props: {
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
  }) => React.ReactNode;
  productPriceInclTax: boolean;
}

function CartItems({ children, productPriceInclTax }: CartItemsProps) {
  const { data: cart, loading } = useCartState();
  const { removeItem } = useCartDispatch();

  const items = (cart?.items || []).map((item) => ({
    id: item.cartItemId,
    name: item.productName,
    thumbnail: item.thumbnail,
    qty: item.qty,
    sku: item.productSku,
    url: item.productUrl,
    variantOptions: item.variantOptions || [],
    price: productPriceInclTax
      ? item.productPriceInclTax.text
      : item.productPrice.text,
    lineTotal: productPriceInclTax
      ? item.lineTotalInclTax.text
      : item.lineTotal.text,
    errors: item.errors || []
  }));
  const isEmpty = items.length === 0;
  const totalItems = cart?.totalQty || 0;

  const handleRemoveItem = async (itemId: string) => {
    await removeItem(itemId);
  };

  return (
    <div className="cart-items">
      <Area id="cartItemsBefore" noOuter />
      {children ? (
        children({
          items,
          loading,
          isEmpty,
          totalItems,
          onRemoveItem: handleRemoveItem,
          SkeletonCartItem,
          EmptyCart,
          CartItemComponent
        })
      ) : (
        <DefaultCartItems
          items={items}
          loading={loading}
          onRemoveItem={handleRemoveItem}
        />
      )}
      <Area id="cartItemsAfter" noOuter />
    </div>
  );
}

export {
  CartItems,
  DefaultCartItems,
  CartItemComponent,
  CartTableHeader,
  EmptyCart,
  SkeletonValue
};

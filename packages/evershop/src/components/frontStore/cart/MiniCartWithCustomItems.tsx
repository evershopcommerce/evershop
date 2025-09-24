import React from 'react';
import { useCartDispatch, CartSyncTrigger } from './cartContext.js';
import { MiniCart } from './MiniCart.js';

/**
 * Example showing the enhanced MiniCart with custom cart items rendering
 */
export function MiniCartWithCustomItems() {
  return (
    <MiniCart
      cartUrl="/cart"
      renderCartItems={({ items, loading, onRemoveItem, CartItemComponent }) => (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center bg-gray-50 p-3 rounded-lg">
              {/* Custom compact layout for mini cart */}
              <div className="flex-shrink-0">
                <img 
                  src={item.thumbnail || '/placeholder-image.jpg'} 
                  alt={item.name}
                  className="w-12 h-12 object-cover rounded"
                />
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.name}
                </p>
                <p className="text-xs text-gray-500">
                  Qty: {item.qty} × {item.price}
                </p>
                {/* Show variant options if any */}
                {item.variantOptions.length > 0 && (
                  <div className="text-xs text-gray-400 mt-1">
                    {item.variantOptions.map((option, index) => (
                      <span key={index}>
                        {option.attributeName}: {option.optionText}
                        {index < item.variantOptions.length - 1 && ', '}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-shrink-0 ml-3">
                <button
                  onClick={() => onRemoveItem(item.id)}
                  disabled={loading}
                  className="text-red-500 hover:text-red-700 text-xs disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    />
  );
}

/**
 * Example using the default CartItemComponent with custom wrapper
 */
export function MiniCartWithWrappedDefaultItems() {
  return (
    <MiniCart
      cartUrl="/cart"
      renderCartItems={({ items, loading, onRemoveItem, CartItemComponent }) => (
        <div className="border-2 border-dashed border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-600 mb-3 text-center font-medium">
            🎨 Custom Styled Items
          </p>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded border shadow-sm">
                <CartItemComponent
                  item={item}
                  loading={loading}
                  onRemoveItem={onRemoveItem}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    />
  );
}

/**
 * Example with minimal item display
 */
export function MiniCartWithMinimalItems() {
  return (
    <MiniCart
      cartUrl="/cart"
      showItemCount={true}
      renderCartItems={({ items, loading, onRemoveItem }) => (
        <div className="divide-y divide-gray-100">
          {items.map((item) => (
            <div key={item.id} className="py-2 flex justify-between items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.name}
                </p>
                <p className="text-xs text-gray-500">
                  {item.qty} × {item.price} = {item.lineTotal}
                </p>
              </div>
              <button
                onClick={() => onRemoveItem(item.id)}
                disabled={loading}
                className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                aria-label="Remove item"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    />
  );
}

/**
 * Demo component showing all variants
 */
export function MiniCartDemo() {
  const cartDispatch = useCartDispatch();

  const handleAddTestItem = async () => {
    try {
      await cartDispatch.addItem({ sku: 'TEST-SKU', qty: 1 });
    } catch (error) {
      // Handle error silently for demo purposes
      // In a real app, you'd show a user-friendly message
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">MiniCart with Custom Cart Items</h1>
      
      <div className="mb-6">
        <button
          onClick={handleAddTestItem}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add Test Item
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h2 className="text-lg font-semibold mb-4">Default MiniCart</h2>
          <MiniCart cartUrl="/cart" />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Custom Compact Items</h2>
          <MiniCartWithCustomItems />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Wrapped Default Items</h2>
          <MiniCartWithWrappedDefaultItems />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Minimal Items</h2>
          <MiniCartWithMinimalItems />
        </div>
      </div>

      <div className="mt-8 bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-2">Features:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Cart icon shows loading spinner during sync</li>
          <li>• Dropdown auto-opens when item added (ADD_ITEM trigger)</li>
          <li>• Custom renderCartItems prop for flexible item rendering</li>
          <li>• Access to default CartItemComponent for reuse</li>
          <li>• Supports all CartItems render props (items, loading, onRemoveItem, etc.)</li>
        </ul>
      </div>
    </div>
  );
}
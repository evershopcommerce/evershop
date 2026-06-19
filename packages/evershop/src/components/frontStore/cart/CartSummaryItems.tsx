import { Image } from '@components/common/Image.js';
import { ProductNoThumbnail } from '@components/common/ProductNoThumbnail.js';
import { Skeleton } from '@components/common/ui/Skeleton.js';
import { CartItem } from '@components/frontStore/cart/CartContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

const CartSummarySkeleton: React.FC<{ rows?: number }> = ({ rows = 2 }) => {
  return (
    <ul className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center py-6 animate-pulse">
          <div className="relative mr-4">
            <div className="w-16 h-16 bg-gray-200 rounded border border-border p-2 box-border" />
            <span className="absolute -top-2 -right-2 bg-muted rounded-full w-6 h-6 flex items-center justify-center text-muted-foreground text-sm">
              {i + 1}
            </span>
          </div>
          <div className="flex-1 min-w-0 items-start align-top">
            <Skeleton className="h-4 w-3/5 mb-2" />
            <Skeleton className="h-3 w-2/5 mb-1" />
          </div>
          <div className="ml-auto text-right">
            <Skeleton className="h-4 w-16" />
          </div>
        </li>
      ))}
    </ul>
  );
};

const CartSummaryItemsList: React.FC<{
  items: CartItem[];
  loading: boolean;
  showPriceIncludingTax?: boolean;
}> = ({ items, loading, showPriceIncludingTax }) => {
  if (loading) {
    return <CartSummarySkeleton rows={items.length} />;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-base">{_('Your cart is empty')}</p>
        <p className="text-sm mt-2">{_('Add some items to get started')}</p>
      </div>
    );
  }

  return (
    <ul className="item__summary__list divide-y divide-divider mb-3">
      {items.map((item) => (
        <li key={item.uuid} className="flex items-start py-3">
          <div className="relative mr-4 self-center">
            {item.thumbnail && (
              <Image
                width={100}
                height={100}
                src={item.thumbnail}
                alt={item.productName}
                className="w-16 h-16 object-cover rounded border border-border p-2 box-border"
              />
            )}
            {!item.thumbnail && (
              <ProductNoThumbnail className="w-16 h-16 rounded border border-border p-2 box-border" />
            )}
            <span className="absolute -top-2 -right-2 bg-muted text-muted-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">
              {item.qty}
            </span>
          </div>
          <div className="flex-1 min-w-0 items-start align-top">
            <div className="font-semibold text-sm mb-1">{item.productName}</div>
            {item.variantOptions && item.variantOptions.length > 0 && (
              <div className="space-y-1">
                {item.variantOptions.map((option) => (
                  <div key={option.attributeCode} className="text-xs">
                    <span>{option.attributeName}</span>:{' '}
                    <span className="text-muted-foreground">
                      {option.optionText}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="ml-auto text-right self-center">
            <div className="font-semibold">
              {showPriceIncludingTax
                ? item.lineTotalInclTax.text
                : item.lineTotal.text}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};

export { CartSummaryItemsList };

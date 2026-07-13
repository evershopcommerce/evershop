import { Image } from '@components/common/Image.js';
import { ProductNoThumbnail } from '@components/common/ProductNoThumbnail.js';
import { Skeleton } from '@components/common/ui/Skeleton.js';
import { useCatalogImageDimensions } from '@components/common/useCatalogImageDimensions.js';
import { CartItem } from '@components/frontStore/cart/CartContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { deriveProductImageSize } from '@evershop/evershop/lib/util/deriveProductImageSize';
import React from 'react';

const CartSummarySkeleton: React.FC<{ rows?: number }> = ({ rows = 2 }) => {
  return (
    <ul className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center py-6 animate-pulse">
          <div className="relative mr-4">
            <div className="w-16 h-16 bg-muted rounded border border-border p-2 box-border" />
            <span className="absolute -top-2 -right-2 bg-muted-foreground text-white rounded-full h-5 w-5 flex items-center justify-center text-[10px]">
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
  const thumbSize = deriveProductImageSize(200, useCatalogImageDimensions());
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
    <ul className="item__summary__list divide-y divide-border">
      {items.map((item) => (
        <li key={item.uuid} className="flex items-start py-3">
          <div className="relative mr-4 self-center">
            {item.thumbnail && (
              <Image
                width={thumbSize.width}
                height={thumbSize.height}
                sizes="100px"
                src={item.thumbnail}
                alt={item.productName}
                className="w-16 h-16 object-cover rounded-md border border-border"
              />
            )}
            {!item.thumbnail && (
              <ProductNoThumbnail className="w-16 h-16 rounded-md border border-border" />
            )}
            <span className="absolute -top-2 -right-2 bg-muted-foreground text-white rounded-full h-5 w-5 flex items-center justify-center text-[10px]">
              {item.qty}
            </span>
          </div>
          <div className="flex-1 min-w-0 items-start align-top">
            <div className="text-sm font-medium">{item.productName}</div>
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
            <div className="text-sm font-medium tabular-nums">
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

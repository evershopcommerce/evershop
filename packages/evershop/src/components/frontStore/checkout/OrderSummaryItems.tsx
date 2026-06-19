import { useAppState } from '@components/common/context/app.js';
import { Image } from '@components/common/Image.js';
import { ProductNoThumbnail } from '@components/common/ProductNoThumbnail.js';
import { OrderItem } from '@components/frontStore/customer/CustomerContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

const OrderSummaryItems: React.FC<{
  items: OrderItem[];
}> = ({ items }) => {
  const {
    config: {
      tax: { priceIncludingTax }
    }
  } = useAppState();
  if (items.length === 0) {
    return null;
  }

  return (
    <ul className="order__item__summary__list divide-y divide-border border-b border-border mb-3">
      {items.map((item) => (
        <li key={item.uuid} className="flex items-start py-3">
          <div className="relative mr-4 self-center">
            {item.thumbnail && (
              <Image
                width={100}
                height={100}
                src={item.thumbnail}
                alt={item.productName}
                className="w-16 h-16 object-cover rounded border p-2 box-border border-border"
              />
            )}
            {!item.thumbnail && (
              <ProductNoThumbnail className="w-16 h-16 rounded border border-border p-2 box-border" />
            )}
            <span className="absolute -top-2 -right-2 bg-muted rounded-full w-6 h-6 flex items-center justify-center text-muted-foreground text-sm">
              {item.qty}
            </span>
          </div>
          <div className="flex-1 min-w-0 items-start align-top">
            <div
              className="font-semibold text-sm mb-1"
              title={item.productName}
            >
              {item.productName.length > 50
                ? `${item.productName.substring(0, 50)}...`
                : item.productName}
            </div>
            {item.variantOptions && item.variantOptions.length > 0 && (
              <div className="space-y-1">
                {item.variantOptions.map((option) => (
                  <div
                    key={option.attributeCode}
                    className="text-xs text-gray-700"
                  >
                    {option.attributeName}: {option.optionText}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="ml-auto text-right self-center">
            <div className="font-semibold">
              {priceIncludingTax
                ? item.lineTotalInclTax.text
                : item.lineTotal.text}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};

export { OrderSummaryItems };

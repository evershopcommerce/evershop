import { Area } from '@components/common/Area.js';
import {
  ExtendableTable,
  TableColumn
} from '@components/common/ExtendableTable.js';
import { Image } from '@components/common/Image.js';
import { ProductNoThumbnail } from '@components/common/ProductNoThumbnail.js';
import { CartItem } from '@components/frontStore/cart/CartContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { ItemQuantity } from './ItemQuantity.js';

interface CartItemsTableProps {
  items: CartItem[];
  showPriceIncludingTax?: boolean;
  loading?: boolean;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  currentSort?: { key: string; direction: 'asc' | 'desc' };
  onRemoveItem?: (itemId: string) => Promise<void>;
}

export const DefaultCartItemList: React.FC<CartItemsTableProps> = ({
  items,
  showPriceIncludingTax = true,
  loading = false,
  onSort,
  currentSort,
  onRemoveItem
}) => {
  const columns: TableColumn<CartItem>[] = [
    {
      key: 'productInfo',
      header: { label: _('Product'), className: '' },
      className: 'font-medium align-top',
      sortable: false,
      render: (row) => {
        const priceValue = showPriceIncludingTax
          ? row.productPriceInclTax?.text
          : row.productPrice?.text;
        return (
          <div className="flex justify-start gap-4">
            <div>
              {row.thumbnail ? (
                <Image
                  src={row.thumbnail}
                  alt={row.productName}
                  width={80}
                  height={80}
                  className="rounded-md"
                />
              ) : (
                <ProductNoThumbnail width={80} height={80} />
              )}
            </div>
            <div className="font-medium flex flex-col gap-1 items-start h-full">
              <span className="font-semibold">{row.productName}</span>
              {row.variantOptions?.map((option) => (
                <span key={option.optionId} className="text-xs text-muted">
                  {option.attributeName}: {option.optionText}
                </span>
              ))}
              <span className="text-sm text-muted">
                {priceValue} x {row.qty}
              </span>
              <a
                href="#"
                className="text-red-500 text-sm"
                onClick={(e) => {
                  e.preventDefault();
                  onRemoveItem?.(row.cartItemId);
                }}
              >
                {_('Remove')}
              </a>
              {row.errors?.map((error, index) => (
                <span key={index} className="text-xs text-red-500">
                  {error}
                </span>
              ))}
            </div>
          </div>
        );
      }
    },
    {
      key: 'qty',
      header: { label: _('Quantity'), className: 'text-center' },
      sortable: true,
      render: (row) => {
        return (
          <div className="text-left">
            <ItemQuantity
              initialValue={row.qty}
              cartItemId={row.cartItemId}
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
          </div>
        );
      }
    },
    {
      key: 'lineTotal',
      header: { label: _('Total'), className: 'flex justify-end' },
      sortable: true,
      render: (row) => {
        const totalValue = showPriceIncludingTax
          ? row.lineTotalInclTax?.text
          : row.lineTotal?.text;
        return (
          <div className="text-right">
            <span className="font-bold">{totalValue}</span>
          </div>
        );
      }
    }
  ];

  const [rows, setRows] = React.useState<CartItem[]>(items);

  React.useEffect(() => {
    setRows(items);
  }, [items]);

  return (
    <>
      <Area id="miniCartItemListBefore" noOuter />
      <ExtendableTable
        name="shoppingCartItems"
        columns={columns}
        initialData={rows}
        loading={loading}
        emptyMessage={_('Your cart is empty')}
        onSort={onSort}
        currentSort={currentSort}
        className="cart__items__table border-none table-auto border-spacing-y-2 border-separate w-full"
      />
      <Area id="miniCartItemListAfter" noOuter />
      <style>
        {`
        .cart__items__table th, .cart__items__table td {
          padding: 0.75rem;
        }
        .cart__items__table th {
          border: none;
        }
        .cart__items__table td {
          border: none;
        }
      `}
      </style>
    </>
  );
};

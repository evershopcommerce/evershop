import { Area } from '@components/common/Area.js';
import {
  ExtendableTable,
  TableColumn
} from '@components/common/ExtendableTable.js';
import { Image } from '@components/common/Image.js';
import { ProductNoThumbnail } from '@components/common/ProductNoThumbnail.js';
import { CartItem } from '@components/frontStore/cart/CartContext.js';
import { ItemQuantity } from '@components/frontStore/cart/ItemQuantity.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

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
            <div className="shrink-0">
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
            <div className="font-medium flex flex-col gap-1 items-start h-full min-w-0 flex-1">
              <div className="font-semibold wrap-break-word w-full">
                {row.productName}
              </div>
              {row.variantOptions?.map((option) => (
                <span key={option.optionId} className="text-xs">
                  <span>{option.attributeName}</span>:{' '}
                  <span className="text-muted-foreground">
                    {option.optionText}
                  </span>
                </span>
              ))}
              <span className="text-sm text-muted-foreground">
                {priceValue} x {row.qty}
              </span>
              <a
                href="#"
                className="text-destructive text-sm"
                onClick={(e) => {
                  e.preventDefault();
                  onRemoveItem?.(row.cartItemId);
                }}
              >
                {_('Remove')}
              </a>
              {row.errors?.map((error, index) => (
                <span key={index} className="text-xs text-destructive">
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
      header: { label: _('Quantity'), className: 'text-right' },
      sortable: true,
      render: (row) => {
        return (
          <div className="flex justify-end">
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
                  <span className="min-w-12 text-center">{quantity}</span>
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
      header: { label: _('Total'), className: 'text-right' },
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
      <Area id="cartItemListBefore" noOuter />
      <ExtendableTable
        name="shoppingCartItems"
        columns={columns}
        initialData={rows}
        loading={loading}
        emptyMessage={_('Your cart is empty')}
        onSort={onSort}
        currentSort={currentSort}
        className="cart__items__table border-none table-fixed border-spacing-y-2 border-separate w-full"
      />
      <Area id="cartItemListAfter" noOuter />
      <style>
        {`
        .cart__items__table th, .cart__items__table td {
          padding: 0.75rem;
          white-space: normal;
        }
        .cart__items__table th {
          border: none;
        }
        .cart__items__table td {
          border: none;
        }
        .cart__items__table th:first-child,
        .cart__items__table td:first-child {
          width: 60%;
        }
        .cart__items__table th:nth-child(2),
        .cart__items__table td:nth-child(2) {
          width: 25%;
        }
      `}
      </style>
    </>
  );
};

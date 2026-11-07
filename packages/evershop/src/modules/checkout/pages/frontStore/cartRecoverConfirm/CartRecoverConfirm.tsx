import { useAppState } from '@components/common/context/app.js';
import { Image } from '@components/common/Image.js';
import { ProductNoThumbnail } from '@components/common/ProductNoThumbnail.js';
import { Button, buttonVariants } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface SavedCartItem {
  cartItemId: string;
  productName: string;
  thumbnail?: string | null;
  qty: number;
  variantOptions?: Array<{
    optionId: number;
    attributeName: string;
    optionText: string;
  }>;
  lineTotal?: { text: string };
  lineTotalInclTax?: { text: string };
}

interface CartRecoverConfirmProps {
  cartRecoveryStatus: 'ready' | 'restored' | 'invalid' | null;
  cartRecoveryItems?: SavedCartItem[];
  homeUrl: string;
  cartUrl: string;
}

/**
 * `/cart/recover` (`index.ts` decides): for a valid link, the saved cart's
 * products and the "Restore my cart" button (opening the link changes
 * nothing, only the button does); for a link used already, a way to the
 * cart; otherwise the message for a link that no longer works. A plain
 * form, so the button works before the page is hydrated.
 */
export default function CartRecoverConfirm({
  cartRecoveryStatus,
  cartRecoveryItems = [],
  homeUrl,
  cartUrl
}: CartRecoverConfirmProps) {
  const { config } = useAppState() ?? {};
  const inclTax = Boolean(
    (config as { tax?: { priceIncludingTax?: boolean } } | undefined)?.tax
      ?.priceIncludingTax
  );
  if (cartRecoveryStatus === 'ready') {
    return (
      <div className="cart-recover mx-auto max-w-xl px-4 py-10 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {_('Restore your cart')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {_(
            'The products from your saved cart will be added to your current cart.'
          )}
        </p>
        {cartRecoveryItems.length > 0 && (
          <ul className="cart-recover__items mt-8 divide-y divide-border rounded-lg border border-border text-left">
            {cartRecoveryItems.map((item) => (
              <li
                key={item.cartItemId}
                className="cart-recover__item flex items-center gap-4 p-4"
              >
                <div className="shrink-0">
                  {item.thumbnail ? (
                    <Image
                      src={item.thumbnail}
                      alt={item.productName}
                      width={128}
                      height={128}
                      sizes="64px"
                      objectFit="cover"
                      className="h-16 w-16 rounded-md border border-border"
                    />
                  ) : (
                    <ProductNoThumbnail width={64} height={64} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{item.productName}</div>
                  {item.variantOptions?.map((option) => (
                    <div
                      key={option.optionId}
                      className="mt-0.5 text-xs text-muted-foreground"
                    >
                      {option.attributeName}: {option.optionText}
                    </div>
                  ))}
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {_('Qty')}: {item.qty}
                  </div>
                </div>
                <div className="text-right font-medium tabular-nums">
                  {inclTax ? item.lineTotalInclTax?.text : item.lineTotal?.text}
                </div>
              </li>
            ))}
          </ul>
        )}
        <form method="post" className="mt-8">
          <Button type="submit">{_('Restore my cart')}</Button>
        </form>
      </div>
    );
  }
  if (cartRecoveryStatus === 'restored') {
    return (
      <div className="cart-recover mx-auto max-w-xl px-4 py-10 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {_('This cart was already restored')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {_(
            'Its products were added to a cart the first time this link was used.'
          )}
        </p>
        <a href={cartUrl} className={buttonVariants({ className: 'mt-6' })}>
          {_('Go to your cart')}
        </a>
      </div>
    );
  }
  return (
    <div className="cart-recover mx-auto max-w-xl px-4 py-10 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        {_('This cart link is no longer valid')}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {_('The link may have expired or already been used.')}
      </p>
      <a href={homeUrl} className={buttonVariants({ className: 'mt-6' })}>
        {_('Continue shopping')}
      </a>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    cartRecoveryStatus
    cartRecoveryItems {
      cartItemId
      productName
      thumbnail
      qty
      variantOptions {
        optionId
        attributeName
        optionText
      }
      lineTotal {
        text
      }
      lineTotalInclTax {
        text
      }
    }
    homeUrl: url(routeId: "homepage")
    cartUrl: url(routeId: "cart")
  }
`;

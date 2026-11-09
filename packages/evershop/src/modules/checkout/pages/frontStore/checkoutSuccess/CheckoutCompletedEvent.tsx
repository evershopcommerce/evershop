import {
  CommerceLine,
  lineDiscountTotal,
  netLineTotal,
  publishSafely,
  roundAmount,
  toCommerceItem
} from '@components/frontStore/commerceEventData.js';
import { dispatchCommerceEvent } from '@evershop/evershop/components/common/commerceEvents';
import React from 'react';

interface CheckoutCompletedEventProps {
  order: {
    uuid: string;
    orderNumber: string;
    currency: string;
    coupon?: string | null;
    placedAt?: { value?: string | null } | null;
    paymentStatus?: { code?: string | null } | null;
    totalTaxAmount?: { value: number } | null;
    shippingFeeExclTax?: { value: number } | null;
    grandTotal?: { value: number } | null;
    items: CommerceLine[];
  } | null;
}

/** The orders this browser has published, newest last */
const STORAGE_KEY = 'evershop:checkout_completed';
const REMEMBERED = 20;

function readPublished(): string[] {
  try {
    const list = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function rememberPublished(list: string[]): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(list.slice(-REMEMBERED))
    );
  } catch (e) {
    // Storage blocked or full: the event id (the order uuid) still lets a
    // vendor count the sale once
  }
}

/**
 * Publishes the `checkout_completed` commerce event on the order success
 * page, once per order in this browser: a reload, or the page opened again,
 * publishes nothing (localStorage). The event id is the order uuid. Renders
 * nothing.
 */
export default function CheckoutCompletedEvent({
  order
}: CheckoutCompletedEventProps) {
  React.useEffect(() => {
    if (!order) {
      return;
    }
    const published = readPublished();
    if (published.includes(order.uuid)) {
      return;
    }
    rememberPublished([...published, order.uuid]);
    publishSafely(() => {
      const { currency } = order;
      const items = order.items.map((line) =>
        toCommerceItem(line, line.qty, currency)
      );
      const sum = (amount: (line: CommerceLine) => number) =>
        roundAmount(
          order.items.reduce((total, line) => total + amount(line), 0),
          currency
        );
      dispatchCommerceEvent(
        'checkout_completed',
        {
          orderId: order.uuid,
          orderNumber: order.orderNumber,
          placed: Boolean(order.placedAt?.value),
          paymentStatus: order.paymentStatus?.code ?? null,
          currency,
          value: sum(netLineTotal),
          tax: order.totalTaxAmount?.value ?? 0,
          shipping: order.shippingFeeExclTax?.value ?? 0,
          discount: sum(lineDiscountTotal),
          total: order.grandTotal?.value ?? 0,
          coupon: order.coupon || undefined,
          items
        },
        { id: order.uuid }
      );
    });
  }, [order?.uuid]);

  return null;
}

export const layout = {
  areaId: 'content',
  sortOrder: 100
};

export const query = `
  query Query {
    order (uuid: getContextValue('orderId')) {
      uuid
      orderNumber
      currency
      coupon
      placedAt {
        value
      }
      paymentStatus {
        code
      }
      totalTaxAmount {
        value
      }
      shippingFeeExclTax {
        value
      }
      grandTotal {
        value
      }
      items {
        productId
        variantGroupId
        productSku
        productName
        qty
        thumbnail
        productUrl
        finalPrice {
          value
        }
        finalPriceInclTax {
          value
        }
        lineTotal {
          value
        }
        lineTotalWithDiscount {
          value
        }
        variantOptions {
          optionText
        }
        category {
          name
        }
      }
    }
  }
`;

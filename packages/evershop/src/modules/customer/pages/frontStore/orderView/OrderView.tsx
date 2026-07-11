import { useAppState } from '@components/common/context/app.js';
import { OrderSummaryItems } from '@components/frontStore/checkout/OrderSummaryItems.js';
import { OrderTotalSummary } from '@components/frontStore/checkout/OrderTotalSummary.js';
import { OrderItem } from '@components/frontStore/customer/CustomerContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface ShipmentItem {
  uuid: string;
  qty: number;
  productSku: string | null;
  productName: string | null;
}

interface Shipment {
  uuid: string;
  shipmentId: number;
  carrier: string | null;
  carrierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: {
    code: string;
    name: string;
    badge: string;
    phase: string;
  };
  phase: string;
  shippedAt: { text: string } | null;
  deliveredAt: { text: string } | null;
  canceledAt: { text: string } | null;
  createdAt: { text: string } | null;
  items: ShipmentItem[];
}

interface Order {
  orderId: number;
  uuid: string;
  orderNumber: string;
  createdAt: { text: string };
  grandTotal: { text: string };
  shipmentStatus: { name: string; code: string; badge: string } | null;
  status: { name: string; code: string; badge: string } | null;
  shippingMethodName: string | null;
  shippingMethodData: {
    snapshot?: { name?: string; cost?: number };
  } | null;
  subTotal: { text: string };
  subTotalInclTax: { text: string };
  shippingFeeInclTax: { text: string };
  shippingFeeExclTax: { text: string };
  totalTaxAmount: { text: string };
  discountAmount: { text: string };
  coupon: string | null;
  items: OrderItem[];
  shipments: Shipment[];
}

interface OrderViewProps {
  order: Order | null;
}

const StatusPill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
    {children}
  </span>
);

function whenShipped(shipment: Shipment): string {
  // Direct pending → delivered transitions leave `shippedAt` NULL; fall back
  // to deliveredAt, then to createdAt, per the wiki guidance for templates
  // that need a "when did it ship" line.
  return (
    shipment.shippedAt?.text ??
    shipment.deliveredAt?.text ??
    shipment.createdAt?.text ??
    ''
  );
}

/**
 * Customer-facing order detail page. Shows what the customer paid for at the
 * top (the service-level quote), then a per-shipment block for each fulfillment
 * row with the actual carrier, tracking link, items, and dates.
 *
 * Design intent: the customer should never see the carrier name at checkout
 * (it's a fulfillment metadata field). This page is the FIRST surface where
 * a carrier name appears, because by definition the shipment has actually
 * been handed off.
 */
export default function OrderView({ order }: OrderViewProps) {
  const {
    config: {
      tax: { priceIncludingTax }
    }
  } = useAppState();
  if (!order) {
    return (
      <div className="account mx-auto max-w-2xl py-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          {_('Order not found')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {_(
            'We could not find this order. It may have been removed, or it may belong to a different account.'
          )}
        </p>
        <a
          href="/account/orders"
          className="mt-6 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          ← {_('Back to orders')}
        </a>
      </div>
    );
  }

  return (
    <div className="account mx-auto max-w-2xl py-10">
      <a
        href="/account/orders"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← {_('Back to orders')}
      </a>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {_('Order')} #{order.orderNumber}
          </h1>
          <div className="mt-1 text-sm text-muted-foreground">
            {order.createdAt?.text}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {order.shipmentStatus?.name && (
            <StatusPill>{order.shipmentStatus.name}</StatusPill>
          )}
          {order.status?.name && <StatusPill>{order.status.name}</StatusPill>}
        </div>
      </header>

      <div className="mt-8 space-y-6">
        <section>
          <h2 className="mb-3 h5">{_('Order summary')}</h2>
          <div className="rounded-lg border border-border p-6">
            <OrderSummaryItems items={order.items} />
            <div className="ml-auto max-w-xs">
              <OrderTotalSummary
                shippingCost={
                  priceIncludingTax
                    ? order.shippingFeeInclTax.text
                    : order.shippingFeeExclTax.text
                }
                subTotal={
                  priceIncludingTax
                    ? order.subTotalInclTax.text
                    : order.subTotal.text
                }
                total={order.grandTotal.text}
                shippingMethod={order.shippingMethodName || undefined}
                coupon={order.coupon || ''}
                discountAmount={order.discountAmount.text}
                taxAmount={order.totalTaxAmount.text}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 h5">{_('Shipments')}</h2>
          {order.shipments.length === 0 ? (
            <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
              {_('No shipments yet — your order is being prepared.')}
            </div>
          ) : (
            <div className="space-y-3">
              {order.shipments.map((shipment) => {
                const trackHref = shipment.trackingUrl;
                const carrierLabel = shipment.carrierName ?? shipment.carrier;
                const shippedText = whenShipped(shipment);
                return (
                  <div
                    key={shipment.uuid}
                    className="space-y-3 rounded-lg border border-border p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {_('Shipment')} #{shipment.shipmentId}
                        </span>
                        <StatusPill>{shipment.status.name}</StatusPill>
                      </div>
                      {carrierLabel && (
                        <div className="text-sm text-muted-foreground">
                          {carrierLabel}
                          {shipment.trackingNumber && (
                            <> · {shipment.trackingNumber}</>
                          )}
                        </div>
                      )}
                    </div>

                    <ul className="space-y-1 text-sm">
                      {shipment.items.map((item) => (
                        <li
                          key={item.uuid}
                          className="flex gap-2 text-muted-foreground"
                        >
                          <span className="text-foreground">
                            {item.productName ?? item.productSku ?? _('Item')}
                          </span>
                          <span>× {item.qty}</span>
                        </li>
                      ))}
                    </ul>

                    {(shippedText ||
                      shipment.deliveredAt?.text ||
                      trackHref) && (
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {shipment.phase === 'delivered' &&
                          shipment.deliveredAt?.text && (
                            <span>
                              {_('Delivered')} {shipment.deliveredAt.text}
                            </span>
                          )}
                        {shipment.phase === 'shipped' && shippedText && (
                          <span>
                            {_('Shipped')} {shippedText}
                          </span>
                        )}
                        {shipment.phase === 'canceled' &&
                          shipment.canceledAt?.text && (
                            <span>
                              {_('Canceled')} {shipment.canceledAt.text}
                            </span>
                          )}
                        {trackHref && (
                          <a
                            href={trackHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-foreground hover:underline"
                          >
                            {_('Track shipment →')}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderUuid")) {
      orderId
      uuid
      orderNumber
      createdAt {
        text
      }
      grandTotal {
        text
      }
      shipmentStatus {
        name
        code
        badge
      }
      status {
        name
        code
        badge
      }
      shippingMethodName
      shippingMethodData {
        snapshot {
          name
          cost
        }
      }
      subTotal {
        text
      }
      subTotalInclTax {
        text
      }
      shippingFeeInclTax {
        text
      }
      shippingFeeExclTax {
        text
      }
      totalTaxAmount {
        text
      }
      discountAmount {
        text
      }
      coupon
      items {
        uuid
        productName
        thumbnail
        productSku
        qty
        productUrl
        productPrice {
          text
        }
        productPriceInclTax {
          text
        }
        variantOptions {
          attributeCode
          attributeName
          attributeId
          optionId
          optionText
        }
        lineTotalInclTax {
          text
        }
        lineTotal {
          text
        }
      }
      shipments {
        uuid
        shipmentId
        carrier
        carrierName
        trackingNumber
        trackingUrl
        status {
          code
          name
          badge
          phase
        }
        phase
        shippedAt {
          text
        }
        deliveredAt {
          text
        }
        canceledAt {
          text
        }
        createdAt {
          text
        }
        items {
          uuid
          qty
          productSku
          productName
        }
      }
    }
  }
`;

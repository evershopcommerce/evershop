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
  shippedAt: string | null;
  deliveredAt: string | null;
  canceledAt: string | null;
  createdAt: string;
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
  shipments: Shipment[];
}

interface OrderViewProps {
  order: Order | null;
}

function whenShipped(shipment: Shipment): string {
  // Direct pending → delivered transitions leave `shippedAt` NULL; fall back
  // to deliveredAt, then to createdAt, per the wiki guidance for templates
  // that need a "when did it ship" line.
  return (
    shipment.shippedAt ?? shipment.deliveredAt ?? shipment.createdAt ?? ''
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
  if (!order) {
    return (
      <div className="page-width mt-7">
        <h1 className="text-2xl mb-4">{_('Order not found')}</h1>
        <p className="text-muted-foreground">
          {_('We could not find this order. It may have been removed, or it may belong to a different account.')}
        </p>
      </div>
    );
  }

  return (
    <div className="page-width mt-7 space-y-5">
      <div>
        <a
          href="/account/orders"
          className="text-sm text-primary hover:underline"
        >
          ← {_('All orders')}
        </a>
      </div>

      <header className="border-b border-divider pb-3">
        <h1 className="text-2xl font-semibold">
          {_('Order')} #{order.orderNumber}
        </h1>
        <div className="text-sm text-muted-foreground">
          {order.createdAt?.text}
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          {order.shipmentStatus?.name && (
            <span className="px-2 py-1 rounded border border-divider">
              {order.shipmentStatus.name}
            </span>
          )}
          {order.status?.name && (
            <span className="px-2 py-1 rounded border border-divider">
              {order.status.name}
            </span>
          )}
          <span className="font-semibold">{order.grandTotal.text}</span>
        </div>
      </header>

      {(order.shippingMethodName || order.shippingMethodData?.snapshot?.name) && (
        <section>
          <div className="text-sm text-muted-foreground">{_('You paid for')}</div>
          <div className="font-semibold">
            {order.shippingMethodData?.snapshot?.name ??
              order.shippingMethodName}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-2">{_('Shipments')}</h2>
        {order.shipments.length === 0 ? (
          <div className="text-muted-foreground italic text-sm">
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
                  className="border border-divider rounded p-3 space-y-2"
                >
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {_('Shipment')} #{shipment.shipmentId}
                      </span>
                      <span className="text-xs px-2 py-1 rounded border border-divider">
                        {shipment.status.name}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {carrierLabel && (
                        <>
                          {carrierLabel}
                          {shipment.trackingNumber && (
                            <> · {shipment.trackingNumber}</>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <ul className="text-sm space-y-1">
                    {shipment.items.map((item) => (
                      <li key={item.uuid} className="flex gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>
                          {item.productName ?? item.productSku ?? _('Item')}
                        </span>
                        <span className="text-muted-foreground">
                          × {item.qty}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {(shippedText || shipment.deliveredAt || trackHref) && (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {shipment.phase === 'delivered' && shipment.deliveredAt && (
                        <span>
                          {_('Delivered')} {new Date(shipment.deliveredAt).toLocaleString()}
                        </span>
                      )}
                      {shipment.phase === 'shipped' && shippedText && (
                        <span>
                          {_('Shipped')} {new Date(shippedText).toLocaleString()}
                        </span>
                      )}
                      {shipment.phase === 'canceled' && shipment.canceledAt && (
                        <span>
                          {_('Canceled')} {new Date(shipment.canceledAt).toLocaleString()}
                        </span>
                      )}
                      {trackHref && (
                        <a
                          href={trackHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
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
        shippedAt
        deliveredAt
        canceledAt
        createdAt
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


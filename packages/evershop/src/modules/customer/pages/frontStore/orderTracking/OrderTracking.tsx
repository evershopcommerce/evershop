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
  status: { code: string; name: string; badge: string; phase: string };
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
  shippingMethodData: { snapshot?: { name?: string; cost?: number } } | null;
  shipments: Shipment[];
}

interface OrderTrackingProps {
  order: Order | null;
  trackingTokenStatus: 'ok' | 'expired' | 'invalid' | 'mismatch' | 'no_secret';
}

const StatusPill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
    {children}
  </span>
);

function whenShipped(shipment: Shipment): string {
  return (
    shipment.shippedAt?.text ??
    shipment.deliveredAt?.text ??
    shipment.createdAt?.text ??
    ''
  );
}

/**
 * Anonymous tracking page rendered at `/orders/:uuid/track?token=...`.
 * The token is verified in the page middleware; this component only branches
 * on `trackingTokenStatus`. On 'ok' it queries the order and renders the same
 * shipments block as `/account/orders/:uuid`, minus the back-to-orders link
 * (the customer is not logged in). On 'expired' it shows a friendly CTA to
 * `/account/orders`.
 */
export default function OrderTracking({
  order,
  trackingTokenStatus
}: OrderTrackingProps) {
  if (trackingTokenStatus !== 'ok' || !order) {
    const title =
      trackingTokenStatus === 'expired'
        ? _('This tracking link has expired')
        : _('This tracking link is no longer valid');
    const body =
      trackingTokenStatus === 'expired'
        ? _(
            'Tracking links are good for a limited time. Sign in to your account to see the current status of your order.'
          )
        : _(
            'We could not verify this link. If you received it in an email from us, please try again from the most recent message, or sign in to your account.'
          );
    return (
      <div className="account mx-auto max-w-2xl py-10">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        <a
          href="/account/orders"
          className="mt-6 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          {_('Sign in to view your orders')}
        </a>
      </div>
    );
  }

  return (
    <div className="account mx-auto max-w-2xl py-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
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
        {(order.shippingMethodName ||
          order.shippingMethodData?.snapshot?.name) && (
          <div className="rounded-lg border border-border p-4">
            <div className="text-xs text-muted-foreground">
              {_('You paid for')}
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <div className="text-sm font-medium">
                {order.shippingMethodData?.snapshot?.name ??
                  order.shippingMethodName}
              </div>
              <div className="text-sm font-medium tabular-nums">
                {order.grandTotal.text}
              </div>
            </div>
          </div>
        )}

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
    trackingTokenStatus
    order(uuid: getContextValue("orderUuid", "missing")) {
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

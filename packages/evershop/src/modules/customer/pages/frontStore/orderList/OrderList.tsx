import { useCustomer } from '@components/frontStore/customer/CustomerContext.jsx';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * Customer order list page. Reads from `useCustomer().orders` which the
 * `CustomerProvider` server-injects on initial render. Each row links to
 * `/account/orders/:uuid` for the detail page.
 *
 * MVP layout: order number, date, total, status badge, link to detail. No
 * pagination — the customer context already caps the list size. Filters /
 * sorting are a follow-up.
 */
export default function OrderList() {
  const { customer } = useCustomer();
  const orders = customer?.orders ?? [];

  return (
    <div className="page-width mt-7">
      <h1 className="text-2xl mb-4">{_('Your Orders')}</h1>
      {orders.length === 0 ? (
        <div className="text-muted-foreground italic">
          {_('You have not placed any orders yet.')}
        </div>
      ) : (
        <div className="divide-y border border-divider rounded">
          {orders.map((order) => {
            const status = order.status;
            const shipmentStatus = order.shipmentStatus;
            return (
              <a
                key={order.orderId}
                href={`/account/orders/${order.uuid}`}
                className="flex flex-col md:flex-row md:items-center md:justify-between p-3 hover:bg-muted/40 transition-colors"
              >
                <div>
                  <div className="font-semibold">
                    {_('Order')} #{order.orderNumber}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {order.createdAt?.text}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 md:mt-0">
                  {shipmentStatus?.name && (
                    <span className="text-xs px-2 py-1 rounded border border-divider">
                      {shipmentStatus.name}
                    </span>
                  )}
                  {status?.name && (
                    <span className="text-xs px-2 py-1 rounded border border-divider">
                      {status.name}
                    </span>
                  )}
                  <span className="font-semibold">{order.grandTotal.text}</span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

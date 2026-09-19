import { useCustomer } from '@components/frontStore/customer/CustomerContext.jsx';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * Order list block: the customer's orders, each row linking to
 * `/account/orders/:uuid`. A page component rather than markup inside the
 * `OrderList` shell so a theme can move it from `layouts.json`.
 */
export default function CustomerOrders(): React.ReactElement {
  const { customer } = useCustomer();
  const orders = customer?.orders ?? [];
  return (
    <>
      <h2 className="mb-4 h5">{_('Orders')}</h2>
      {orders.length === 0 ? (
        <div className="text-muted-foreground">
          {_('You have not placed any orders yet.')}
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {orders.map((order) => {
            const status = order.status;
            const shipmentStatus = order.shipmentStatus;
            return (
              <a
                key={order.orderId}
                href={`/account/orders/${order.uuid}`}
                className="flex flex-col gap-2 p-4 transition-colors hover:bg-muted/40 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="font-medium">
                    {_('Order #${orderNumber}', { orderNumber: order.orderNumber })}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {order.createdAt?.text}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {shipmentStatus?.name && (
                    <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                      {shipmentStatus.name}
                    </span>
                  )}
                  {status?.name && (
                    <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                      {status.name}
                    </span>
                  )}
                  <span className="font-medium tabular-nums">
                    {order.grandTotal.text}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </>
  );
}

export const layout = {
  areaId: 'accountPageContent',
  sortOrder: 10
};

import {
  Order,
  useCustomer
} from '@components/frontStore/customer/CustomerContext.jsx';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * Re-skin (2026-07-11): compact order rows (order # + date + status pill +
 * total) matching the /account/orders list and the reference — replaces the old
 * item-thumbnail rows that read heavy in the narrow account column.
 */
const OrderRow: React.FC<{ order: Order }> = ({ order }) => (
  <a
    href={`/account/orders/${order.uuid}`}
    className="flex flex-col gap-2 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
  >
    <div>
      <div className="text-sm font-medium">#{order.orderNumber}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">
        {order.createdAt?.text}
      </div>
    </div>
    <div className="flex items-center gap-3">
      {order.shipmentStatus?.name && (
        <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
          {order.shipmentStatus.name}
        </span>
      )}
      {order.status?.name && (
        <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
          {order.status.name}
        </span>
      )}
      <span className="text-sm font-medium tabular-nums">
        {order.grandTotal.text}
      </span>
    </div>
  </a>
);

export default function OrderHistory({ title }: { title?: string }) {
  const { customer } = useCustomer();
  const orders = customer?.orders || [];
  return (
    <div className="order-history">
      {title && <h2 className="mb-4 h4">{title}</h2>}
      {orders.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          {_('You have not placed any orders yet')}
        </div>
      ) : (
        <div className="order-history-list divide-y divide-border overflow-hidden rounded-lg border border-border">
          {orders.map((order) => (
            <OrderRow order={order} key={order.orderId} />
          ))}
        </div>
      )}
    </div>
  );
}

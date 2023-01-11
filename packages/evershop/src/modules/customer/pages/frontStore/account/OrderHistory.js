import React from 'react';
import Order from './components/Order';

export default function OrderHistory({ customer: { orders = [] } }) {
  return (
    <div className="order-history divide-y">
      {orders.length === 0 && <div className="order-history-empty">You haven't placed any orders yet.</div>}
      {orders.map((order) => (
        <div className="order-history-order border-divider py-2">
          <Order order={order} key={order.orderId} />
        </div>
      ))}
    </div>
  );
}

export const layout = {
  areaId: 'accountPageLeft',
  sortOrder: 10
};

export const query = `
  query Query {
    customer (id: getContextValue("customerId", null)) {
      orders {
        orderId
        orderNumber
        createdAt {
          text
        }
        shipmentStatus {
          name
          code
          badge
        }
        paymentStatus {
          name
          code
          badge
        }
        grandTotal {
          value
          text
        }
        items {
          productName
          thumbnail
          productPrice {
            value
            text
          }
          productSku
          qty
        }
    }
  }
}
`;

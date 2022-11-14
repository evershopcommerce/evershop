import React from 'react';
import Order from './components/Order';

export default function OrderHistory({ customer: { orders = [] } }) {
  return <div className='order-history'>
    {orders.length === 0 && <div className='order-history-empty'>You haven't placed any orders yet.</div>}
    {orders.map((order) => <div className='order-history-order'>
      <Order order={order} key={order.orderId} />
    </div>)}
  </div>
}

export const layout = {
  areaId: 'accountPageLeft',
  sortOrder: 10
}

export const query = `
  query Query {
    customer (id: getContextValue("userId", null)) {
      orders {
        orderId
        createdAt
        grandTotal {
          value
          text
        }
        items {
          productName
          qty
        }
    }
  }
}
`;
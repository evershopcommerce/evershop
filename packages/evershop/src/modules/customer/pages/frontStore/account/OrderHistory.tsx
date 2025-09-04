import React from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';
import { OrderDetail } from '../../../components/OrderDetail.js';

interface OrderHistoryProps {
  customer: {
    orders: {
      orderId: string;
      orderNumber: string;
      createdAt: {
        text: string;
      };
      shipmentStatus: {
        name: string;
        code: string;
        badge: string;
      };
      paymentStatus: {
        name: string;
        code: string;
        badge: string;
      };
      grandTotal: {
        value: number;
        text: string;
      };
      items: {
        productName: string;
        thumbnail?: string;
        productPrice: {
          value: number;
          text: string;
        };
        productSku: string;
        qty: number;
      }[];
    }[];
  };
}
export default function OrderHistory({
  customer: { orders = [] }
}: OrderHistoryProps) {
  return (
    <div className="order-history divide-y">
      {orders.length === 0 && (
        <div className="order-history-empty">
          {_('You have not placed any orders yet')}
        </div>
      )}
      {orders.map((order) => (
        <div
          className="order-history-order border-divider py-5"
          key={order.orderId}
        >
          <OrderDetail order={order} key={order.orderId} />
        </div>
      ))}
    </div>
  );
}

export const layout = {
  areaId: 'accountPageOrderHistory',
  sortOrder: 10
};

export const query = `
  query Query {
    customer: currentCustomer {
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

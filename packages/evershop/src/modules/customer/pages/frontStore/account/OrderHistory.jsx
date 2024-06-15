import PropTypes from 'prop-types';
import React from 'react';
import Order from '@components/frontStore/customer/detail/Order';
import { _ } from '@evershop/evershop/src/lib/locale/translate';

export default function OrderHistory({ customer: { orders = [] } }) {
  return (
    <div className="order-history divide-y">
      {orders.length === 0 && (
        <div className="order-history-empty">
          {_('You have not placed any orders yet')}
        </div>
      )}
      {orders.map((order) => (
        <div className="order-history-order border-divider py-8">
          <Order order={order} key={order.orderId} />
        </div>
      ))}
    </div>
  );
}

OrderHistory.propTypes = {
  customer: PropTypes.shape({
    orders: PropTypes.arrayOf(
      PropTypes.shape({
        orderId: PropTypes.string.isRequired,
        orderNumber: PropTypes.string.isRequired,
        createdAt: PropTypes.shape({
          text: PropTypes.string.isRequired
        }),
        shipmentStatus: PropTypes.shape({
          name: PropTypes.string.isRequired,
          code: PropTypes.string.isRequired,
          badge: PropTypes.string.isRequired
        }),
        paymentStatus: PropTypes.shape({
          name: PropTypes.string.isRequired,
          code: PropTypes.string.isRequired,
          badge: PropTypes.string.isRequired
        }),
        grandTotal: PropTypes.shape({
          value: PropTypes.number.isRequired,
          text: PropTypes.string.isRequired
        }),
        items: PropTypes.arrayOf(
          PropTypes.shape({
            productName: PropTypes.string.isRequired,
            thumbnail: PropTypes.string,
            productPrice: PropTypes.shape({
              value: PropTypes.number.isRequired,
              text: PropTypes.string.isRequired
            }),
            productSku: PropTypes.string.isRequired,
            qty: PropTypes.number.isRequired
          })
        )
      })
    )
  }).isRequired
};

export const layout = {
  areaId: 'accountPageLeft',
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

import { Card } from '@components/common/ui/Card';
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import PropTypes from 'prop-types';
import React from 'react';

export default function OrderHistory({ customer: { orders = [] } }) {
  return (
    <Card title="Order History">
      <CardHeader>
        <CardTitle>{_('Order History')}</CardTitle>
        <CardDescription>
          {_('Recently placed orders by this customer')}
        </CardDescription>
      </CardHeader>
      {orders.length < 1 && (
        <CardContent>
          <div>{_('Customer does not have any order yet.')}</div>
        </CardContent>
      )}
      {orders.length > 0 && (
        <>
          {orders.map((order) => (
            <CardContent key={order.uuid}>
              <div className="flex justify-between items-center gap-2">
                <div>
                  <a
                    className="font-semibold text-interactive"
                    href={order.editUrl}
                  >
                    #{order.orderNumber}
                  </a>
                </div>
                <div>
                  <span>{order.createdAt.text}</span>
                </div>
                <div>
                  <span>{order.paymentStatus.name}</span>
                </div>
                <div>
                  <span>{order.shipmentStatus.name}</span>
                </div>
                <div>
                  <span>{order.grandTotal.text}</span>
                </div>
              </div>
            </CardContent>
          ))}
        </>
      )}
    </Card>
  );
}

OrderHistory.propTypes = {
  customer: PropTypes.shape({
    orders: PropTypes.arrayOf(
      PropTypes.shape({
        orderNumber: PropTypes.string
      })
    )
  }).isRequired
};

export const layout = {
  areaId: 'leftSide',
  sortOrder: 10
};

export const query = `
  query Query {
    customer(id: getContextValue("customerUuid", null)) {
      orders {
        orderNumber
        uuid
        editUrl
        createdAt {
          text
        }
        shipmentStatus {
          name
        }
        paymentStatus {
          name
        }
        grandTotal {
          text
        }
      }
    }
  }
`;

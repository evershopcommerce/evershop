import React from 'react';
import { useAppState } from '../../../../../../lib/context/app';
import { get } from '../../../../../../lib/util/get';
import { Card } from '../../../../../cms/views/admin/Card';

export default function OrderInfo(props) {
  const order = get(useAppState(), 'order', {});
  return (
    <Card title="Customer">
      <Card.Session>
        <a href="" className="text-interactive hover:underline block">{order.customer_full_name}</a>
        <span>No orders</span>
      </Card.Session>
      <Card.Session title="Contact information">
        <div><a href="#" className="text-interactive hover:underline">{order.customer_email}</a></div>
        <div><span>{get(order, 'shippingAddress.telephone')}</span></div>
      </Card.Session>
      <Card.Session title="Shipping address">
        <div><span>{get(order, 'shippingAddress.full_name')}</span></div>
        <div><span>{get(order, 'shippingAddress.address_1')}</span></div>
        <div>
          <span>{get(order, 'shippingAddress.postcode')}</span>
          <span>{get(order, 'shippingAddress.city')}</span>
          <span>{get(order, 'shippingAddress.province')}</span>
        </div>
        <div><span>{get(order, 'shippingAddress.country')}</span></div>
      </Card.Session>
      <Card.Session title="Billing address">
        <div><span>{get(order, 'billingAddress.full_name')}</span></div>
        <div><span>{get(order, 'billingAddress.address_1')}</span></div>
        <div>
          <span>{get(order, 'billingAddress.postcode')}</span>
          <span>{get(order, 'billingAddress.city')}</span>
          <span>{get(order, 'billingAddress.province')}</span>
        </div>
        <div><span>{get(order, 'billingAddress.country')}</span></div>
      </Card.Session>
    </Card>
  );
}

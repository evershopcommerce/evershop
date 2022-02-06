import React from 'react';
import Area from '../../../../../../lib/components/Area';
import { useAppState } from '../../../../../../lib/context/app';
import { get } from '../../../../../../lib/util/get';
import { Card } from '../../../../../cms/views/admin/Card';

function Status({ status }) {
  return (
    <td>
      <span className={`badge badge-${status.badge}`}>
        {' '}
        {status.name}
      </span>
    </td>
  );
}

function Note({ note }) {
  return (
    <td>
      <i>{note}</i>
    </td>
  );
}

function Weight({ weight }) {
  return <td>{weight}</td>;
}

function Actions({ status, startShipUrl, completeShipUrl }) {
  const startShipment = (e) => {
    e.preventDefault();
    fetch(
      startShipUrl,
      false,
      'GET',
      {},
      null,
      (response) => {
        location.reload();
      }
    );
  };

  const completeShipment = (e) => {
    e.preventDefault();
    fetch(
      completeShipUrl,
      false,
      'GET',
      {},
      null,
      (response) => {
        location.reload();
      }
    );
  };
  return (
    <td>
      {status === 'pending' && <a href="#" onClick={(e) => startShipment(e)}><span>Start shipment</span></a>}
      {status === 'delivering' && <a href="#" onClick={(e) => completeShipment(e)}><span>Complete shipment</span></a>}
    </td>
  );
}

export default function Shipment({ startShipUrl, completeShipUrl }) {
  const order = get(useAppState(), 'order', {});
  const currency = get(useAppState(), 'order.currency');
  const language = get(useAppState(), 'shop.language', 'en');
  const grandTotal = new Intl.NumberFormat(language, { style: 'currency', currency }).format(order.grand_total);

  return (
    <Card title="Shipment">
      <Card.Session>
        <table className="table table-bordered">
          <thead>
            <tr>
              <Area
                id="orderShipmentBlockInfoHeader"
                orderId={order.order_id}
                method={order.shipping_method}
                shippingNote={order.shipping_note}
                methodName={order.shipping_method_name}
                grandTotal={grandTotal}
                weight={order.total_weight}
                status={order.shipment_status}
                noOuter
                coreComponents={[
                  {
                    component: { default: 'th' },
                    props: { children: <span>Status</span> },
                    sortOrder: 10,
                    id: 'shipment_status_header'
                  },
                  {
                    component: { default: 'th' },
                    props: { children: <span>Method</span> },
                    sortOrder: 20,
                    id: 'shipment_method_header'
                  },
                  {
                    component: { default: 'th' },
                    props: { children: <span>Total weight</span> },
                    sortOrder: 30,
                    id: 'shipment_weight_header'
                  },
                  {
                    component: { default: 'th' },
                    props: { children: <span>Customer notes</span> },
                    sortOrder: 40,
                    id: 'shipment_notes_header'
                  },
                  {
                    component: { default: 'th' },
                    props: { children: <span>Actions</span> },
                    sortOrder: 50,
                    id: 'shipment_action_header'
                  }
                ]}
              />
            </tr>
          </thead>
          <tbody>
            <tr>
              <Area
                id="orderShipmentInfoRow"
                orderId={order.order_id}
                method={order.shipping_method}
                shippingNote={order.shipping_note}
                methodName={order.shipping_method_name}
                grandTotal={grandTotal}
                weight={order.total_weight}
                status={order.shipment_status}
                noOuter
                coreComponents={[
                  {
                    component: { default: Status },
                    props: { status: order.shipmentStatus },
                    sortOrder: 10,
                    id: 'order_shipment_status'
                  },
                  {
                    component: { default: 'td' },
                    props: { children: <span>{order.shipping_method_name}</span> },
                    sortOrder: 20,
                    id: 'order_shipment_method'
                  },
                  {
                    component: { default: Weight },
                    props: { weight: order.total_weight },
                    sortOrder: 30,
                    id: 'order_shipment_weight'
                  },
                  {
                    component: { default: Note },
                    props: { note: order.shipping_note },
                    sortOrder: 40,
                    id: 'order_shipment_note'
                  },
                  {
                    component: { default: Actions },
                    props: { status: order.shipment_status, startShipUrl, completeShipUrl },
                    sortOrder: 50,
                    id: 'order_shipment_action'
                  }
                ]}
              />
            </tr>
          </tbody>
        </table>
      </Card.Session>
    </Card>
  );
}

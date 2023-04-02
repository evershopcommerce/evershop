import PropTypes from 'prop-types';
import React from 'react';
import Area from '@components/common/Area';
import { Card } from '@components/admin/cms/Card';

function Status({ status }) {
  return (
    <td>
      <span className={`badge badge-${status.badge}`}> {status.name}</span>
    </td>
  );
}

Status.propTypes = {
  status: PropTypes.shape({
    badge: PropTypes.string,
    name: PropTypes.string
  }).isRequired
};

function Note({ note }) {
  return (
    <td>
      <i>{note}</i>
    </td>
  );
}

Note.propTypes = {
  note: PropTypes.string
};

Note.defaultProps = {
  note: ''
};

function Weight({ weight }) {
  return <td>{weight.text}</td>;
}

Weight.propTypes = {
  weight: PropTypes.shape({
    text: PropTypes.string
  }).isRequired
};

function Actions({ status, startShipUrl, completeShipUrl }) {
  const startShipment = (e) => {
    e.preventDefault();
    fetch(startShipUrl, false, 'GET', {}, null, () => {
      // eslint-disable-next-line no-restricted-globals
      location.reload();
    });
  };

  const completeShipment = (e) => {
    e.preventDefault();
    fetch(completeShipUrl, false, 'GET', {}, null, () => {
      // eslint-disable-next-line no-restricted-globals
      location.reload();
    });
  };
  return (
    <td>
      {status === 'pending' && (
        <a href="#" onClick={(e) => startShipment(e)}>
          <span>Start shipment</span>
        </a>
      )}
      {status === 'delivering' && (
        <a href="#" onClick={(e) => completeShipment(e)}>
          <span>Complete shipment</span>
        </a>
      )}
    </td>
  );
}

Actions.propTypes = {
  completeShipUrl: PropTypes.string.isRequired,
  startShipUrl: PropTypes.string.isRequired,
  status: PropTypes.string.isRequired
};

export default function Shipment({
  order: {
    orderId,
    shippingNote,
    shippingMethod,
    shippingMethodName,
    shipmentStatus,
    totalWeight,
    grandTotal
  },
  startShipUrl,
  completeShipUrl
}) {
  return (
    <Card title="Shipment">
      <Card.Session>
        <table className="table table-bordered">
          <thead>
            <tr>
              <Area
                id="orderShipmentBlockInfoHeader"
                orderId={orderId}
                method={shippingMethod}
                shippingNote={shippingNote}
                methodName={shippingMethodName}
                grandTotal={grandTotal}
                weight={totalWeight}
                status={shipmentStatus}
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
                orderId={orderId}
                method={shippingMethod}
                shippingNote={shippingNote}
                methodName={shippingMethodName}
                grandTotal={grandTotal}
                weight={totalWeight}
                status={shipmentStatus}
                noOuter
                coreComponents={[
                  {
                    component: { default: Status },
                    props: { status: shipmentStatus },
                    sortOrder: 10,
                    id: 'order_shipment_status'
                  },
                  {
                    component: { default: 'td' },
                    props: { children: <span>{shippingMethodName}</span> },
                    sortOrder: 20,
                    id: 'order_shipment_method'
                  },
                  {
                    component: { default: Weight },
                    props: { weight: totalWeight },
                    sortOrder: 30,
                    id: 'order_shipment_weight'
                  },
                  {
                    component: { default: Note },
                    props: { note: shippingNote },
                    sortOrder: 40,
                    id: 'order_shipment_note'
                  },
                  {
                    component: { default: Actions },
                    props: {
                      status: shipmentStatus,
                      startShipUrl,
                      completeShipUrl
                    },
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

Shipment.propTypes = {
  completeShipUrl: PropTypes.string.isRequired,
  startShipUrl: PropTypes.string.isRequired,
  order: PropTypes.shape({
    orderId: PropTypes.string,
    shippingNote: PropTypes.string,
    shippingMethod: PropTypes.string,
    shippingMethodName: PropTypes.string,
    shipmentStatus: PropTypes.string,
    totalWeight: PropTypes.shape({
      text: PropTypes.string
    }),
    grandTotal: PropTypes.shape({
      value: PropTypes.number,
      text: PropTypes.string
    })
  }).isRequired
};

export const layout = `
  query Query {
    order(id: getContextValue("orderId")) {
      orderId
      shippingNote
      shippingMethod
      shippingMethodName
      shipmentStatus
      totalWeight
      grandTotal {
        value
        text
      }
    }
    shipmentStatusList
    startShipUrl: url(routeId: )
    completeShipUrl
  }
`;

/* eslint-disable react/no-array-index-key */
/* eslint-disable react/jsx-closing-tag-location */
import PropTypes from 'prop-types';
import React from 'react';
import Button from '@components/common/form/Button';

export default function TrackingButton({ order: { shipment }, carriers }) {
  if (!shipment || !shipment.trackingNumber || !shipment.carrier) {
    return null;
  }

  const carrier = carriers.find((c) => c.code === shipment.carrier);

  if (!carrier || !carrier.trackingUrl) {
    return null;
  }

  // Replace {trackingNumber} with the actual tracking number
  const url = carrier.trackingUrl.replace(
    /\{\s*trackingNumber\s*\}/g,
    shipment.trackingNumber
  );

  return (
    <Button
      title="Track shipment"
      variant="primary"
      onAction={() => {
        window.open(url, '_blank').focus();
      }}
    />
  );
}

TrackingButton.propTypes = {
  order: PropTypes.shape({
    shipment: PropTypes.shape({
      carrier: PropTypes.string,
      trackingNumber: PropTypes.string
    }).isRequired
  }).isRequired,
  carriers: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      code: PropTypes.string,
      trackingUrl: PropTypes.string
    })
  ).isRequired
};

export const layout = {
  areaId: 'order_actions',
  sortOrder: 15
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      shipment {
        shipmentId
        carrier
        trackingNumber
        updateShipmentApi
      }
      createShipmentApi
    },
    carriers {
      name
      code
      trackingUrl
    }
  }
`;

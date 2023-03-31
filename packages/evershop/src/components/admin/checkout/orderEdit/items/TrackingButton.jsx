/* eslint-disable react/no-array-index-key */
/* eslint-disable react/jsx-closing-tag-location */
import PropTypes from 'prop-types';
import React from 'react';
import Button from '@components/common/form/Button';

export function TrackingButton({ shipment }) {
  if (!shipment || !shipment.trackingNumber || !shipment.carrierName) {
    return null;
  }

  let url = null; // TODO: This should let extension to add a carrier with link
  if (shipment.carrierName === 'Fedex') {
    url = `https://www.fedex.com/fedextrack/?trknbr=${shipment.trackingNumber}`;
  }
  if (shipment.carrierName === 'USPS') {
    url = `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${shipment.trackingNumber}`;
  }
  if (shipment.carrierName === 'Fedex') {
    url = `https://www.ups.com/WebTracking?loc=en_US&requester=ST&trackNums=${shipment.trackingNumber}`;
  }
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
  shipment: PropTypes.shape({
    carrierName: PropTypes.string,
    trackingNumber: PropTypes.string
  })
};

TrackingButton.defaultProps = {
  shipment: undefined
};

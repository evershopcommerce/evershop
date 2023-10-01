import PropTypes from 'prop-types';
import React from 'react';
import Badge from '@components/common/Badge';

export default function ShipmentStatus({ order: { shipmentStatus } }) {
  if (shipmentStatus) {
    return (
      <Badge
        variant={shipmentStatus.badge}
        title={shipmentStatus.name}
        progress={shipmentStatus.progress}
      />
    );
  } else {
    return null;
  }
}

ShipmentStatus.propTypes = {
  order: PropTypes.shape({
    shipmentStatus: PropTypes.shape({
      badge: PropTypes.string,
      name: PropTypes.string,
      progress: PropTypes.number
    })
  }).isRequired
};

export const layout = {
  areaId: 'pageHeadingLeft',
  sortOrder: 20
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      shipmentStatus {
        code
        badge
        progress
        name
      }
    }
  }
`;

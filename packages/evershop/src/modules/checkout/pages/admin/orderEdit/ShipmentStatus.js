import React from 'react';
import Badge from '../../../../../lib/components/Badge';

export default function ShipmentStatus({ order: { shipmentStatus } }) {
  if (shipmentStatus) {
    return <Badge variant={shipmentStatus.badge} title={shipmentStatus.name} progress={shipmentStatus.progress} />;
  } else {
    return null;
  }
}

export const layout = {
  areaId: 'pageHeadingLeft',
  sortOrder: 20
}

export const query = `
  query Query {
    order(id: getContextValue("orderId")) {
      shipmentStatus {
        code
        badge
        progress
        name
      }
    }
  }
`
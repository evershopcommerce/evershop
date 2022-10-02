import React from 'react';
import Badge from '../../../../../lib/components/Badge';

export default function PaymentStatus({ order: { paymentStatus } }) {
  if (paymentStatus) {
    return <Badge variant={paymentStatus.badge} title={paymentStatus.name || 'Unknown'} progress={paymentStatus.progress} />;
  } else {
    return null;
  }
}

export const layout = {
  areaId: 'pageHeadingLeft',
  sortOrder: 10
}

export const query = `
  query Query {
    order(id: getContextValue("orderId")) {
      paymentStatus {
        code
        badge
        progress
        name
      }
    }
  }
`
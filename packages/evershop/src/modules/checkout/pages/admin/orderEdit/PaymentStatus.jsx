import PropTypes from 'prop-types';
import React from 'react';
import Badge from '@components/common/Badge';

export default function PaymentStatus({ order: { paymentStatus } }) {
  if (paymentStatus) {
    return (
      <Badge
        variant={paymentStatus.badge}
        title={paymentStatus.name || 'Unknown'}
        progress={paymentStatus.progress}
      />
    );
  } else {
    return null;
  }
}

PaymentStatus.propTypes = {
  order: PropTypes.shape({
    paymentStatus: PropTypes.shape({
      badge: PropTypes.string,
      name: PropTypes.string,
      progress: PropTypes.number
    })
  }).isRequired
};

export const layout = {
  areaId: 'pageHeadingLeft',
  sortOrder: 10
};

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
`;

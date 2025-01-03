import PropTypes from 'prop-types';
import React from 'react';
import Badge from '@components/common/Badge';

export default function PaymentStatusRow({ status }) {
  return (
    <td>
      <Badge
        title={status.name}
        variant={status.badge}
        progress={status.progress}
      />
    </td>
  );
}

PaymentStatusRow.propTypes = {
  status: PropTypes.shape({
    name: PropTypes.string.isRequired,
    badge: PropTypes.string.isRequired,
    progress: PropTypes.string.isRequired
  }).isRequired
};

import PropTypes from 'prop-types';
import React from 'react';
import Badge from '@components/common/Badge';

export default function ShipmentStatusRow({ status }) {
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

ShipmentStatusRow.propTypes = {
  status: PropTypes.string.isRequired
};

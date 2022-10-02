import PropTypes from 'prop-types';
import React from 'react';
import Badge from '../../../../../../lib/components/Badge';

export default function ShipmentStatusRow({ status, statusList }) {
  const shipmentStatus = statusList.find((s) => s.value === status);
  if (shipmentStatus) {
    return <td><Badge title={shipmentStatus.text} variant={shipmentStatus.badge} progress={shipmentStatus.progress} /></td>;
  } else {
    return <td>{status}</td>;
  }
}

ShipmentStatusRow.propTypes = {
  status: PropTypes.string.isRequired,
  statusList: PropTypes.arrayOf({
    code: PropTypes.string.isRequired,
  }).isRequired
};

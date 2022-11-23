import PropTypes from 'prop-types';
import React from 'react';
import Badge from '../../../../../../lib/components/Badge';

export default function ShipmentStatusRow({ status }) {
  return <td><Badge title={status.name} variant={status.badge} progress={status.progress} /></td>;
}

ShipmentStatusRow.propTypes = {
  status: PropTypes.string.isRequired,
  statusList: PropTypes.arrayOf({
    code: PropTypes.string.isRequired,
  }).isRequired
};

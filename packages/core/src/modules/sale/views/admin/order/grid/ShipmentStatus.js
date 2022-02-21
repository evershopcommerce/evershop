import PropTypes from 'prop-types';
import React from 'react';
import Badge from '../../../../../../lib/components/Badge';
import { useAppState } from '../../../../../../lib/context/app';
import { get } from '../../../../../../lib/util/get';

export default function ShipmentStatusRow({ id, areaProps: { row } }) {
  const context = useAppState();
  const shipmentStatus = get(context, 'shipmentStatus', []);
  const status = shipmentStatus.find((s) => s.code === row[id]);
  if (status) {
    return <td><Badge title={status.name} variant={status.badge} progress={status.progress} /></td>;
  } else {
    return <td>{row[id]}</td>;
  }
}

ShipmentStatusRow.propTypes = {
  id: PropTypes.string.isRequired,
  areaProps: PropTypes.shape({
    row: PropTypes.shape({
      editUrl: PropTypes.string,
      id: PropTypes.string
    })
  }).isRequired
};

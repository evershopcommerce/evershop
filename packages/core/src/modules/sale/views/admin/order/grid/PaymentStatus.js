import PropTypes from 'prop-types';
import React from 'react';
import { useAppState } from '../../../../../../lib/context/app';
import { get } from '../../../../../../lib/util/get';
import Badge from '../../../../../../lib/components/Badge';

export default function PaymentStatusRow({ id, areaProps: { row } }) {
  const context = useAppState();
  const paymentStatus = get(context, 'paymentStatus', []);
  const status = paymentStatus.find((s) => s.code === row[id]);
  if (status) {
    return <td><Badge title={status.name} variant={status.badge} progress={status.progress} /></td>;
  } else {
    return <td>{row[id]}</td>;
  }
}

PaymentStatusRow.propTypes = {
  id: PropTypes.string.isRequired,
  areaProps: PropTypes.shape({
    row: PropTypes.shape({
      editUrl: PropTypes.string,
      id: PropTypes.string
    })
  }).isRequired
};

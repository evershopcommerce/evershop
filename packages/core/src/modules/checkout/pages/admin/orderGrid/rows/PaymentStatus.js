import PropTypes from 'prop-types';
import React from 'react';
import Badge from '../../../../../../lib/components/Badge';

export default function PaymentStatusRow({ status, statusList }) {
  const paymentStatus = statusList.find((s) => s.value === status);
  if (paymentStatus) {
    return <td><Badge title={paymentStatus.text} variant={paymentStatus.badge} progress={paymentStatus.progress} /></td>;
  } else {
    return <td>{status}</td>;
  }
}

PaymentStatusRow.propTypes = {
  status: PropTypes.string.isRequired,
  statusList: PropTypes.arrayOf({
    code: PropTypes.string.isRequired,
  }).isRequired
};

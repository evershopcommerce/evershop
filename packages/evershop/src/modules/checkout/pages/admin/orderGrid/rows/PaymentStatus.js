import PropTypes from 'prop-types';
import React from 'react';
import Badge from '../../../../../../lib/components/Badge';

export default function PaymentStatusRow({ status }) {
  return <td><Badge title={status.name} variant={status.badge} progress={status.progress} /></td>;
}

PaymentStatusRow.propTypes = {
  status: PropTypes.string.isRequired,
  statusList: PropTypes.arrayOf({
    code: PropTypes.string.isRequired,
  }).isRequired
};

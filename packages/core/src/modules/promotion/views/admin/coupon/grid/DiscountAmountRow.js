import PropTypes from 'prop-types';
import React from 'react';
import { useAppState } from '../../../../../../lib/context/app';

export default function DiscountAmountRow({ id, areaProps: { row } }) {
  const context = useAppState();
  return (
    <td>
      <div>
        <span>{new Intl.NumberFormat(context.language, { style: 'currency', currency: context.currency }).format(row[id])}</span>
      </div>
    </td>
  );
}

DiscountAmountRow.propTypes = {
  id: PropTypes.string.isRequired,
  areaProps: PropTypes.shape({
    row: PropTypes.shape({
      editUrl: PropTypes.string,
      id: PropTypes.string
    })
  }).isRequired
};

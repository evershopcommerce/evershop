import { useAppState } from '@components/common/context/app';
import PropTypes from 'prop-types';
import React from 'react';

export default function PriceRow({ id, areaProps }) {
  const context = useAppState();
  return (
    <td>
      <div>
        <span>
          {new Intl.NumberFormat(context.language, {
            style: 'currency',
            currency: context.currency
          }).format(areaProps.row[id])}
        </span>
      </div>
    </td>
  );
}

PriceRow.propTypes = {
  areaProps: PropTypes.shape({
    row: PropTypes.shape({
      id: PropTypes.number
    })
  }).isRequired,
  id: PropTypes.string.isRequired
};

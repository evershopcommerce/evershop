import PropTypes from 'prop-types';
import React from 'react';


export default function QtyRow({ qty }) {
  return (
    <td>
      <div>
        <span>{qty}</span>
      </div>
    </td>
  );
}

QtyRow.propTypes = {
  qty: PropTypes.number.isRequired
};

import PropTypes from 'prop-types';
import React from 'react';

export default function TypeRow({ id, areaProps: { row } }) {
  return (
    <td>
      <div>
        <span style={{ textTransform: 'capitalize' }}>{row[id]}</span>
      </div>
    </td>
  );
}

TypeRow.propTypes = {
  areaProps: PropTypes.shape({
    row: PropTypes.shape({
      id: PropTypes.string
    })
  }).isRequired,
  id: PropTypes.string.isRequired
};

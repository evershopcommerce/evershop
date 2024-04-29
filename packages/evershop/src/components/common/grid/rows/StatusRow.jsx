import PropTypes from 'prop-types';
import React from 'react';
import Dot from '@components/common/Dot';

export default function StatusRow({ id, areaProps }) {
  return (
    <td>
      <div>
        {parseInt(areaProps.row[id], 10) === 0 && (
          <Dot variant="default" size="1.2rem" />
        )}
        {parseInt(areaProps.row[id], 10) === 1 && (
          <Dot variant="success" size="1.2rem" />
        )}
      </div>
    </td>
  );
}

StatusRow.propTypes = {
  areaProps: PropTypes.shape({
    row: PropTypes.shape({
      id: PropTypes.number
    })
  }).isRequired,
  id: PropTypes.string.isRequired
};

import PropTypes from 'prop-types';
import React from 'react';

export default function YesNoRow({ id, areaProps }) {
  return (
    <td>
      <div className="nodejscart-switch">
        <div>
          {parseInt(areaProps.row[id], 10) === 0 && <span>No</span>}
          {parseInt(areaProps.row[id], 10) === 1 && <span>Yes</span>}
        </div>
      </div>
    </td>
  );
}

YesNoRow.propTypes = {
  areaProps: PropTypes.shape({
    row: PropTypes.objectOf(
      PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    )
  }).isRequired,
  id: PropTypes.string.isRequired
};

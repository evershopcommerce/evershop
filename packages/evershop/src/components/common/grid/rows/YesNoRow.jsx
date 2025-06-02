import PropTypes from 'prop-types';
import React from 'react';


export default function YesNoRow({ value }) {
  return (
    <td>
      <div className="nodejscart-switch">
        <div>
          {(value === false || parseInt(value, 10) === 0) && <span>No</span>}
          {(value === true || parseInt(value, 10) === 1) && <span>Yes</span>}
        </div>
      </div>
    </td>
  );
}

YesNoRow.propTypes = {
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.bool
  ]).isRequired
};

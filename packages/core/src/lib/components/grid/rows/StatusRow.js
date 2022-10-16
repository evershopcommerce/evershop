import PropTypes from "prop-types";
import React from "react";
import Off from '../../Off';
import On from '../../On';

export default function StatusRow({ id, areaProps }) {
  return (
    <td>
      <div className="nodejscart-switch">
        <div>
          {parseInt(areaProps.row[id], 10) === 0 && <Off />}
          {parseInt(areaProps.row[id], 10) === 1 && <On />}
        </div>
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

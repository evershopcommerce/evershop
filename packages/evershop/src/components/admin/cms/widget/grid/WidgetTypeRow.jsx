import PropTypes from 'prop-types';
import React from 'react';

export default function WidgetTypeRow({ code, types }) {
  const type = types.find((t) => t.code === code);
  if (!type) {
    return (
      <td>
        <div>Unknown</div>
      </td>
    );
  } else {
    return (
      <td>
        <div>{type.name}</div>
      </td>
    );
  }
}

WidgetTypeRow.propTypes = {
  code: PropTypes.string.isRequired,
  types: PropTypes.arrayOf(
    PropTypes.shape({
      code: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired
    })
  ).isRequired
};

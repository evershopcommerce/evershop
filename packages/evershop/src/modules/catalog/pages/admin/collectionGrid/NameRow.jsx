import PropTypes from 'prop-types';
import React from 'react';

export default function NameRow({ id, editUrl, areaProps: { row } }) {
  return (
    <td>
      <div>
        <a className="hover:underline font-semibold" href={row[editUrl]}>
          {row[id]}
        </a>
      </div>
    </td>
  );
}

NameRow.propTypes = {
  areaProps: PropTypes.shape({
    row: PropTypes.shape({
      id: PropTypes.string,
      editUrl: PropTypes.string
    })
  }).isRequired,
  editUrl: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired
};

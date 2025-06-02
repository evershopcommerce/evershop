import PropTypes from 'prop-types';
import React from 'react';


export default function OrderNumberRow({ editUrl, name }) {
  return (
    <td>
      <div>
        <a className="hover:underline font-semibold" href={editUrl}>
          #{name}
        </a>
      </div>
    </td>
  );
}

OrderNumberRow.propTypes = {
  editUrl: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired
};

import PropTypes from 'prop-types';
import React from 'react';

export default function ProductNameRow({ url, name }) {
  return (
    <td>
      <div>
        <a className="hover:underline font-semibold" href={url}>
          {name}
        </a>
      </div>
    </td>
  );
}

ProductNameRow.propTypes = {
  name: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired
};

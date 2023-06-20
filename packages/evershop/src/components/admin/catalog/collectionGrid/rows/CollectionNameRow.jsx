import PropTypes from 'prop-types';
import React from 'react';

export default function CollectionNameRow({ name, url }) {
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

CollectionNameRow.propTypes = {
  name: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired
};

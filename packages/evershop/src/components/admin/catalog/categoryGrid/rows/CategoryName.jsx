import PropTypes from 'prop-types';
import React from 'react';

export default function CategoryNameRow({ category }) {
  return (
    <td>
      <div>
        <a className="hover:underline font-semibold" href={category.editUrl}>
          {category.path.map((p) => p.name).join(' / ')}
        </a>
      </div>
    </td>
  );
}

CategoryNameRow.propTypes = {
  category: PropTypes.shape({
    editUrl: PropTypes.string.isRequired,
    path: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired
      })
    ).isRequired
  }).isRequired
};

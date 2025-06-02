import PropTypes from 'prop-types';
import React from 'react';

import './General.scss';
import Editor from '@components/common/Editor';

export default function CategoryInfo({
  category: { name, description, image }
}) {
  return (
    <div className="page-width">
      <div className="mb-4 md:mb-8 category__general">
        {image && (
          <img src={image.url} alt={name} className="category__image" />
        )}
        <div className="category__info prose prose-base max-w-none">
          <h1 className="category__name">{name}</h1>
          <div className="category__description">
            <Editor rows={description} />
          </div>
        </div>
      </div>
    </div>
  );
}

CategoryInfo.propTypes = {
  category: PropTypes.shape({
    name: PropTypes.string.isRequired,
    description: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        size: PropTypes.number.isRequired,
        columns: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.string.isRequired,
            size: PropTypes.number.isRequired,

            data: PropTypes.object.isRequired
          })
        )
      })
    ),
    image: PropTypes.shape({
      url: PropTypes.string.isRequired
    })
  }).isRequired
};

export const layout = {
  areaId: 'content',
  sortOrder: 5
};

export const query = `
  query Query {
    category(id: getContextValue('categoryId')) {
      name
      description
      image {
        alt
        url
      }
    }
}`;

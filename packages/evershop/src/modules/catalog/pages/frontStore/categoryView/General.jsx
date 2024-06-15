/* eslint-disable react/no-danger */
import React from 'react';
import PropTypes from 'prop-types';
import './General.scss';
import { CKEditor } from '@components/common/CKEditor';

export default function CategoryInfo({
  category: { name, description, image }
}) {
  return (
    <div className="page-width">
      <div className="mb-4 md:mb-8 category__general">
        {image && (
          <img src={image.url} alt={name} className="category__image" />
        )}
        <div className="category__info">
          <div>
            <h1 className="category__name">{name}</h1>
            <div className="category__description">
              <CKEditor content={description} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

CategoryInfo.propTypes = {
  category: PropTypes.shape({
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
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

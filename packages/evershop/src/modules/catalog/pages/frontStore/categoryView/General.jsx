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
      <div
        className="p-4 mb-1 md:mb-2"
        style={
          image
            ? {
                background: `url(${image.url}) no-repeat center center`,
                backgroundSize: 'cover'
              }
            : { background: '#685f58' }
        }
      >
        <div className="text-left text-white">
          <h1 className="category-name mt-25">{name}</h1>
          <div className="category-description">
            <CKEditor content={description} />
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
        url
      }
    }
}`;

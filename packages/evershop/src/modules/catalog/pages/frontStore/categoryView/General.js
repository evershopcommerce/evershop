import React from 'react';
import PropTypes from 'prop-types';
import './General.scss';

export default function CategoryInfo({ category: { name, description, image } }) {
  return (
    <div className="page-width">
      <div className="p-4 mb-1 md:mb-2" style={image ? { background: `url(${image.url}) no-repeat center center` } : { background: '#685f58' }}>
        <div className="text-left text-white">
          <h1 className="category-name mt-25">{name}</h1>
          <div className="category-description" dangerouslySetInnerHTML={{ __html: description }} />
        </div>
      </div>
    </div>
  );
}

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

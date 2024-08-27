import React from 'react';
import PropTypes from 'prop-types';
import Area from '@components/common/Area';

export default function CategoryView({ category }) {
  if (!category.showProducts) {
    return null;
  }
  return (
    <div className="page-width grid grid-cols-1 md:grid-cols-4 gap-8">
      <Area id="leftColumn" className="md:col-span-1" />
      <Area id="rightColumn" className="md:col-span-3" />
    </div>
  );
}

CategoryView.propTypes = {
  category: PropTypes.shape({
    showProducts: PropTypes.number
  }).isRequired
};

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    category(id: getContextValue('categoryId')) {
      showProducts
    }
}`;

import Area from '@components/common/Area.js';
import React from 'react';

interface CategoryViewProps {
  category: {
    showProducts: number;
  };
}

export default function CategoryView({ category }: CategoryViewProps) {
  if (!category.showProducts) {
    return null;
  }
  return (
    <div className="page-width grid grid-cols-1 md:grid-cols-4 gap-5">
      <Area id="leftColumn" className="md:col-span-1" />
      <Area id="rightColumn" className="md:col-span-3" />
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    category: currentCategory {
      showProducts
    }
}`;

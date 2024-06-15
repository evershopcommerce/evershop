import React from 'react';
import Area from '@components/common/Area';

export default function CategoryView() {
  return (
    <div className="page-width grid grid-cols-1 md:grid-cols-4 gap-8">
      <Area id="leftColumn" className="md:col-span-1" />
      <Area id="rightColumn" className="md:col-span-3" />
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

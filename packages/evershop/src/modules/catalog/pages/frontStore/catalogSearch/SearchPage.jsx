import React from 'react';
import Area from '@components/common/Area';

export default function SearchPage() {
  return (
    <div className="page-width grid grid-cols-1 ">
      <Area id="oneColumn" />
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

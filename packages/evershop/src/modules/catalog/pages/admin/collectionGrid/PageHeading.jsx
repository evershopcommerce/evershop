import { PageHeading } from '@components/admin/PageHeading.js';
import React from 'react';

export default function CollectionGridPageHeading() {
  return (
    <div className="w-2/3" style={{ margin: '0 auto' }}>
      <PageHeading heading="Collections" />
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

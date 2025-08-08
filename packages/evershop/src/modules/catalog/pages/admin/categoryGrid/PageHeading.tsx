import { PageHeading } from '@components/admin/PageHeading.js';
import React from 'react';

export default function CategoryGridPageHeading() {
  return <PageHeading heading="Categories" />;
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

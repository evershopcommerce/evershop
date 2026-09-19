import { PageHeading } from '@components/admin/PageHeading.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export default function BlogCategoryHeading() {
  return <PageHeading heading={_('Blog Categories')} />;
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

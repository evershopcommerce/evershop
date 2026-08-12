import { PageHeading } from '@components/admin/PageHeading.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export default function BlogPostHeading() {
  return <PageHeading heading={_('Blog Posts')} />;
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

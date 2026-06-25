import { PageHeading } from '@components/admin/PageHeading.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export default function BlogTagHeading() {
  return <PageHeading heading={_('Blog Tags')} />;
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

import { PageHeading } from '@components/admin/PageHeading.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export default function CategoryGridPageHeading() {
  return <PageHeading heading={_('Categories')} />;
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

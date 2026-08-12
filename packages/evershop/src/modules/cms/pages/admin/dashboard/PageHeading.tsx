import { PageHeading } from '@components/admin/PageHeading.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export default function DashboardPageHeading() {
  return <PageHeading heading={_('Dashboard')} />;
}

export const layout = {
  areaId: 'content',
  sortOrder: 5
};

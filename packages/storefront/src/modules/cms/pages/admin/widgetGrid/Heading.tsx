import { PageHeading } from '@components/admin/PageHeading.js';
import React from 'react';

export default function WidgetGridHeading() {
  return <PageHeading heading="Widgets" />;
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

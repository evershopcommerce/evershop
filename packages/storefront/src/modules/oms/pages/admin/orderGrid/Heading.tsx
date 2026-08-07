import { PageHeading } from '@components/admin/PageHeading.js';
import React from 'react';

export default function OrderGridHeading() {
  return <PageHeading heading="Orders" />;
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

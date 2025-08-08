import { PageHeading } from '@components/admin/PageHeading.js';
import React from 'react';

export interface AttributGridPageHeadingProps {
  backUrl?: string;
}
export default function AttributGridPageHeading() {
  return <PageHeading heading="Attributes" />;
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

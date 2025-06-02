import PageHeading from '@components/admin/cms/PageHeading';
import React from 'react';

export default function Heading() {
  return <PageHeading backUrl={null} heading="Coupons" />;
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

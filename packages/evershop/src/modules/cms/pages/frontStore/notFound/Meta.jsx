import Meta from '@components/common/Meta';
import Title from '@components/common/Title';
import React from 'react';

export default function SeoMeta() {
  return (
    <>
      <Title title="Page Not Found" />
      <Meta name="description" content="Page Not Found" />
    </>
  );
}

export const layout = {
  areaId: 'head',
  sortOrder: 1
};

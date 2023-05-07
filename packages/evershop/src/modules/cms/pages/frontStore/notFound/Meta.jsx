import React from 'react';
import Meta from '@components/common/Meta';
import Title from '@components/common/Title';

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

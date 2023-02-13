import React from 'react';
import Meta from '../../../../../lib/components/Meta';
import Title from '../../../../../lib/components/Title';

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

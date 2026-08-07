import { Meta } from '@components/common/Meta.js';
import { Title } from '@components/common/Title.js';
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

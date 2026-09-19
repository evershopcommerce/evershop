import { Meta } from '@components/common/Meta.js';
import { Title } from '@components/common/Title.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export default function SeoMeta() {
  return (
    <>
      <Title title={_('Page Not Found')} />
      <Meta name="description" content={_('Page Not Found')} />
    </>
  );
}

export const layout = {
  areaId: 'head',
  sortOrder: 1
};

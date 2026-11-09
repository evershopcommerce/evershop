import { PageHeading } from '@components/admin/PageHeading.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export default function ImportGridHeading() {
  return (
    <div className="w-5/6 mx-auto">
      <PageHeading heading={_('Import')} />
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

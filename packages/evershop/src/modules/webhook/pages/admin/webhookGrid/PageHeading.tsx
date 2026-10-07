import { PageHeading } from '@components/admin/PageHeading.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export default function WebhookGridHeading() {
  return (
    <div className="w-2/3 mx-auto">
      <PageHeading heading={_('Webhooks')} />
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

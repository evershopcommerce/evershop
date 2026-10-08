import { PageHeading } from '@components/admin/PageHeading.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export default function WebhookEditHeading({
  backUrl,
  webhook
}: {
  backUrl?: string;
  webhook?: { name?: string } | null;
}) {
  return (
    <div className="w-2/3 mx-auto">
    <PageHeading
      backUrl={backUrl}
      heading={
        webhook
          ? _('Editing ${name}', { name: webhook.name ?? '' })
          : _('Create a new webhook')
      }
    />
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 5
};

export const query = `
  query Query {
    webhook(id: getContextValue("webhookUuid", null)) {
      name
    }
    backUrl: url(routeId: "webhookGrid")
  }
`;

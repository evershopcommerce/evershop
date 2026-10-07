import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface NewWebhookButtonProps {
  newWebhookUrl: string;
  webhookMax: number;
  webhooks: Array<{ uuid: string }>;
}

export default function NewWebhookButton({
  newWebhookUrl,
  webhookMax,
  webhooks
}: NewWebhookButtonProps) {
  const full = webhooks.length >= webhookMax;
  return (
    <Button
      disabled={full}
      title={
        full
          ? _('You can create at most ${max} webhooks', {
              max: `${webhookMax}`
            })
          : undefined
      }
      onClick={() => (window.location.href = newWebhookUrl)}
    >
      {_('New webhook')}
    </Button>
  );
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};

export const query = `
  query Query {
    newWebhookUrl: url(routeId: "webhookNew")
    webhookMax
    webhooks {
      uuid
    }
  }
`;

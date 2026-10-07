import { SettingMenuItem } from '@components/admin/SettingMenuItem.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface WebhookSettingMenuProps {
  webhookGridUrl: string;
}

export default function WebhookSettingMenu({
  webhookGridUrl
}: WebhookSettingMenuProps) {
  return (
    <SettingMenuItem
      url={webhookGridUrl}
      title={_('Webhooks')}
      description={_('Send store events to other systems')}
    />
  );
}

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 40
};

export const query = `
  query Query {
    webhookGridUrl: url(routeId: "webhookGrid")
  }
`;

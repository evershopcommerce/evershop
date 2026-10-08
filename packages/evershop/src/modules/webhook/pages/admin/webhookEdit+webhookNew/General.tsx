import { InputField } from '@components/common/form/InputField.js';
import { ToggleField } from '@components/common/form/ToggleField.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface GeneralProps {
  webhook?: {
    name?: string;
    url?: string;
    enabled?: boolean;
  } | null;
}

export default function General({ webhook }: GeneralProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{_('General Information')}</CardTitle>
        <CardDescription>
          {_('Where to send the events, and whether this webhook is active.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <InputField
          id="webhook_name"
          name="name"
          label={_('Name')}
          placeholder={_('For example: Order sync')}
          defaultValue={webhook?.name}
          required
          validation={{ required: _('Name is required') }}
        />
        <InputField
          id="webhook_url"
          name="url"
          label={_('URL')}
          placeholder="https://example.com/webhooks/evershop"
          helperText={_(
            'EverShop sends a POST request with a JSON body to this URL. It must start with https://.'
          )}
          defaultValue={webhook?.url}
          required
          validation={{ required: _('URL is required') }}
        />
        <ToggleField
          name="enabled"
          label={_('Status')}
          defaultValue={webhook?.enabled ?? true}
          trueLabel={_('Enabled')}
          falseLabel={_('Disabled')}
        />
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'wideScreen',
  sortOrder: 10
};

export const query = `
  query Query {
    webhook(id: getContextValue("webhookUuid", null)) {
      name
      url
      enabled
    }
  }
`;

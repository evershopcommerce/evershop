import { FormButtons } from '@components/admin/FormButtons.js';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import { toast } from '@components/common/ui/Sonner.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface WebhookNewFormProps {
  action: string;
  gridUrl: string;
}

export default function WebhookNewForm({
  action,
  gridUrl
}: WebhookNewFormProps) {
  return (
    <Form
      action={action}
      method="POST"
      onSuccess={(response) => {
        toast.success(_('Webhook created successfully!'));
        setTimeout(() => {
          const editUrl = response.data.links.find(
            (link) => link.rel === 'edit'
          ).href;
          window.location.href = editUrl;
        }, 1500);
      }}
      id="webhookNewForm"
      submitBtn={false}
    >
      <div className="w-2/3 mx-auto">
        <div className="grid gap-5 grid-cols-1">
          <Area id="wideScreen" noOuter />
        </div>
        <FormButtons formId="webhookNewForm" cancelUrl={gridUrl} />
      </div>
    </Form>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "createWebhook")
    gridUrl: url(routeId: "webhookGrid")
  }
`;

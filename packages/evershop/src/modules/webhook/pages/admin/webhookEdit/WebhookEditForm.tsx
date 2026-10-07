import { FormButtons } from '@components/admin/FormButtons.js';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import React from 'react';

interface WebhookEditFormProps {
  action: string;
  gridUrl: string;
}

export default function WebhookEditForm({
  action,
  gridUrl
}: WebhookEditFormProps) {
  return (
    <Form
      method="PATCH"
      action={action}
      id="webhookEditForm"
      submitBtn={false}
    >
      <div className="w-2/3 mx-auto">
        <div className="grid gap-5 grid-cols-1">
          <Area id="wideScreen" noOuter />
        </div>
        <FormButtons formId="webhookEditForm" cancelUrl={gridUrl} />
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
    action: url(routeId: "updateWebhook", params: [{key: "id", value: getContextValue("webhookUuid")}]),
    gridUrl: url(routeId: "webhookGrid")
  }
`;

import { FormButtons } from '@components/admin/FormButtons.js';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import React from 'react';

interface BlogTagEditFormProps {
  action: string;
  gridUrl: string;
}

export default function BlogTagEditForm({
  action,
  gridUrl
}: BlogTagEditFormProps) {
  return (
    <Form method="PATCH" action={action} id="blogTagEditForm" submitBtn={false}>
      <div className="grid gap-5 grid-cols-1">
        <Area id="wideScreen" noOuter />
      </div>
      <FormButtons formId="blogTagEditForm" cancelUrl={gridUrl} />
    </Form>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "updateBlogTag", params: [{key: "id", value: getContextValue("blogTagUuid")}]),
    gridUrl: url(routeId: "blogTagGrid")
  }
`;

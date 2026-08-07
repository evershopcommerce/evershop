import { FormButtons } from '@components/admin/FormButtons.js';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import React from 'react';

interface CmsPageEditFormProps {
  action: string;
  gridUrl: string;
}
export default function CmsPageEditForm({
  action,
  gridUrl
}: CmsPageEditFormProps) {
  return (
    <Form method="PATCH" action={action} id="cmsPageEditForm" submitBtn={false}>
      <div className="grid gap-5 grid-cols-1 w-2/3 mx-auto">
        <Area id="wideScreen" noOuter />
      </div>
      <FormButtons formId="cmsPageEditForm" cancelUrl={gridUrl} />
    </Form>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "updateCmsPage", params: [{key: "id", value: getContextValue("cmsPageUuid")}]),
    gridUrl: url(routeId: "cmsPageGrid")
  }
`;

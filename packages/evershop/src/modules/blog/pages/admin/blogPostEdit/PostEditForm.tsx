import { FormButtons } from '@components/admin/FormButtons.js';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import React from 'react';

interface BlogPostEditFormProps {
  action: string;
  gridUrl: string;
}

export default function BlogPostEditForm({
  action,
  gridUrl
}: BlogPostEditFormProps) {
  return (
    <Form
      method="PATCH"
      action={action}
      id="blogPostEditForm"
      submitBtn={false}
    >
      <div className="grid grid-cols-3 gap-x-5 grid-flow-row">
        <div className="col-span-2 grid grid-cols-1 gap-5 auto-rows-max">
          <Area id="leftSide" noOuter />
        </div>
        <div className="col-span-1 grid grid-cols-1 gap-5 auto-rows-max">
          <Area id="rightSide" noOuter />
        </div>
      </div>
      <FormButtons formId="blogPostEditForm" cancelUrl={gridUrl} />
    </Form>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "updateBlogPost", params: [{key: "id", value: getContextValue("blogPostUuid")}]),
    gridUrl: url(routeId: "blogPostGrid")
  }
`;

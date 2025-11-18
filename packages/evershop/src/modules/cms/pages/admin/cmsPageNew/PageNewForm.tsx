import { FormButtons } from '@components/admin/FormButtons.js';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import React from 'react';
import { toast } from 'react-toastify';

interface CmsPageNewFormProps {
  action: string;
  gridUrl: string;
}
export default function CmsPageNewForm({
  action,
  gridUrl
}: CmsPageNewFormProps) {
  return (
    <Form
      action={action}
      method="POST"
      onSuccess={(response) => {
        toast.success('Page created successfully!');
        setTimeout(() => {
          const editUrl = response.data.links.find(
            (link) => link.rel === 'edit'
          ).href;
          window.location.href = editUrl;
        }, 1500);
      }}
      id="cmsPageNewForm"
      submitBtn={false}
    >
      <div className="grid gap-5 grid-cols-1 w-2/3 mx-auto">
        <Area id="wideScreen" noOuter />
      </div>
      <FormButtons formId="cmsPageNewForm" cancelUrl={gridUrl} />
    </Form>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "createCmsPage")
    gridUrl: url(routeId: "cmsPageGrid")
  }
`;

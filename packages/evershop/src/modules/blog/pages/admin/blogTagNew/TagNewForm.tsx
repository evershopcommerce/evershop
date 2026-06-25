import { FormButtons } from '@components/admin/FormButtons.js';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { toast } from 'react-toastify';

interface BlogTagNewFormProps {
  action: string;
  gridUrl: string;
}

export default function BlogTagNewForm({
  action,
  gridUrl
}: BlogTagNewFormProps) {
  return (
    <Form
      action={action}
      method="POST"
      onSuccess={(response) => {
        toast.success(_('Tag created successfully!'));
        setTimeout(() => {
          const editUrl = response.data.links.find(
            (link) => link.rel === 'edit'
          ).href;
          window.location.href = editUrl;
        }, 1500);
      }}
      id="blogTagNewForm"
      submitBtn={false}
    >
      <div className="grid gap-5 grid-cols-1">
        <Area id="wideScreen" noOuter />
      </div>
      <FormButtons formId="blogTagNewForm" cancelUrl={gridUrl} />
    </Form>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "createBlogTag")
    gridUrl: url(routeId: "blogTagGrid")
  }
`;

import { FormButtons } from '@components/admin/FormButtons.js';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import React from 'react';
import { toast } from 'react-toastify';

interface CollectionNewFormProps {
  action: string;
  gridUrl: string;
}

export default function CollectionNewForm({
  action,
  gridUrl
}: CollectionNewFormProps) {
  return (
    <Form
      id="collectionNewForm"
      action={action}
      submitBtn={false}
      method="POST"
      onSuccess={(response) => {
        toast.success('Collection created successfully!');
        setTimeout(() => {
          const editUrl = response.data.links.find(
            (link) => link.rel === 'edit'
          ).href;
          window.location.href = editUrl;
        }, 1500);
      }}
    >
      <div className="w-2/3" style={{ margin: '0 auto' }}>
        <div className="grid gap-5">
          <Area id="collectionFormInner" noOuter />
        </div>
        <FormButtons formId="collectionNewForm" cancelUrl={gridUrl} />
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
    action: url(routeId: "createCollection")
    gridUrl: url(routeId: "collectionGrid")
  }
`;

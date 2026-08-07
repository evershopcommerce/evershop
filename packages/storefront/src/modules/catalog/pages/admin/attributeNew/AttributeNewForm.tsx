import { FormButtons } from '@components/admin/FormButtons.js';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import React from 'react';
import { toast } from 'react-toastify';

interface AttributeNewFormProps {
  action: string;
  gridUrl: string;
}
export default function AttributeNewForm({
  action,
  gridUrl
}: AttributeNewFormProps) {
  return (
    <Form
      action={action}
      method="POST"
      id="attributeNewForm"
      onSuccess={(response) => {
        toast.success('Attribute created successfully!');
        setTimeout(() => {
          const editUrl = response.data.links.find(
            (link) => link.rel === 'edit'
          ).href;
          window.location.href = editUrl;
        }, 1500);
      }}
      submitBtn={false}
    >
      <div className="grid grid-cols-3 gap-x-5 grid-flow-row ">
        <div className="col-span-2 grid grid-cols-1 gap-5 auto-rows-max">
          <Area id="leftSide" noOuter />
        </div>
        <div className="col-span-1 grid grid-cols-1 gap-5 auto-rows-max">
          <Area id="rightSide" noOuter />
        </div>
      </div>
      <FormButtons formId="attributeNewForm" cancelUrl={gridUrl} />
    </Form>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "createAttribute")
    gridUrl: url(routeId: "attributeGrid")
  }
`;

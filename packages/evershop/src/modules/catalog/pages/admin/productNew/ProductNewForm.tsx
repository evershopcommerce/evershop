import { FormButtons } from '@components/admin/FormButtons.js';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import React from 'react';
import { toast } from 'react-toastify';

export default function ProductNewForm({
  action,
  gridUrl
}: {
  action: string;
  gridUrl: string;
}) {
  return (
    <Form
      id="productNewForm"
      method="POST"
      action={action}
      submitBtn={false}
      onSuccess={(response) => {
        toast.success('Product created successfully!');
        const editUrl = response.data.links.find(
          (link) => link.rel === 'edit'
        ).href;
        window.location.href = editUrl;
        setTimeout(() => {
          window.location.href = gridUrl;
        }, 1500);
      }}
    >
      <div className="grid grid-cols-3 gap-x-5 grid-flow-row ">
        <div className="col-span-2 grid grid-cols-1 gap-5 auto-rows-max">
          <Area id="leftSide" noOuter />
        </div>
        <div className="col-span-1 grid grid-cols-1 gap-5 auto-rows-max">
          <Area id="rightSide" noOuter />
        </div>
      </div>
      <FormButtons formId="productNewForm" cancelUrl={gridUrl} />
    </Form>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "createProduct"),
    gridUrl: url(routeId: "productGrid")
  }
`;

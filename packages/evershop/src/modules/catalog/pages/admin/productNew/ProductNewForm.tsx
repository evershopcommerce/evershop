import { FormButtons } from '@components/admin/FormButtons.js';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import React from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

export default function ProductNewForm({
  action,
  gridUrl
}: {
  action: string;
  gridUrl: string;
}) {
  const form = useForm({
    shouldUnregister: true
  });
  const submit: SubmitHandler<any> = async (data) => {
    try {
      const images = (data.images || []).map(
        (image: { uuid: string; url: string }) => image.url
      );
      data.images = images;
      const response = await fetch(action, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...data, action: undefined, method: undefined })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error.message);
      } else {
        toast.success('Product created successfully');
        const editUrl = result.data.links.find(
          (link) => link.rel === 'edit'
        ).href;
        setTimeout(() => {
          window.location.href = editUrl;
        }, 1500);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };
  return (
    <Form
      id="productNewForm"
      method="POST"
      action={action}
      form={form}
      onSubmit={submit}
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

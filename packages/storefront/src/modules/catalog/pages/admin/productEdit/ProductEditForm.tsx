import Area from '@components/common/Area.js';
import Button from '@components/common/Button.js';
import { Form, useFormContext } from '@components/common/form/Form.js';
import React from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

const FormButton: React.FC<{
  formId: string;
  cancelUrl: string;
}> = ({ cancelUrl, formId }) => {
  const {
    formState: { isSubmitting }
  } = useFormContext();
  return (
    <div className="form-submit-button flex border-t border-divider mt-4 pt-4 justify-between">
      <Button
        title="Cancel"
        variant="danger"
        outline
        onAction={() => {
          window.location.href = cancelUrl;
        }}
      />
      <Button
        title="Save"
        onAction={() => {
          (document.getElementById(formId) as HTMLFormElement).dispatchEvent(
            new Event('submit', { cancelable: true, bubbles: true })
          );
        }}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default function ProductEditForm({
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
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...data, action: undefined, method: undefined })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error.message);
      } else {
        toast.success('Product updated successfully');
        form.setValue('product_id', result.data.uuid);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };
  return (
    <Form
      form={form}
      action={action}
      method="PATCH"
      submitBtn={false}
      id="productEditForm"
      onSubmit={submit}
    >
      <div className="grid grid-cols-3 gap-x-5 grid-flow-row ">
        <div className="col-span-2 grid grid-cols-1 gap-5 auto-rows-max">
          <Area id="leftSide" noOuter />
        </div>
        <div className="col-span-1 grid grid-cols-1 gap-5 auto-rows-max">
          <Area id="rightSide" noOuter />
        </div>
      </div>
      <FormButton formId="productEditForm" cancelUrl={gridUrl} />
    </Form>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "updateProduct", params: [{key: "id", value: getContextValue("productUuid")}]),
    gridUrl: url(routeId: "productGrid")
  }
`;

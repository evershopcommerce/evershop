import { FormButtons } from '@components/admin/FormButtons.js';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import React from 'react';
import { toast } from 'react-toastify';

interface WidgetNewFormProps {
  action: string;
  gridUrl: string;
  type: {
    code: string;
    description: string;
    settingComponent: string;
    defaultSetting: any;
  };
}

export default function WidgetNewForm({
  action,
  gridUrl,
  type
}: WidgetNewFormProps) {
  return (
    <Form
      action={action}
      method="POST"
      onSuccess={(response) => {
        toast.success('Widget created successfully!');
        setTimeout(() => {
          const editUrl = response.data.links.find(
            (link) => link.rel === 'edit'
          ).href;
          window.location.href = editUrl;
        }, 1500);
      }}
      id="widgetNewForm"
      submitBtn={false}
    >
      <InputField type="hidden" name="type" defaultValue={type.code} />
      <div className="grid grid-cols-3 gap-x-5 grid-flow-row ">
        <div className="col-span-2 grid grid-cols-1 gap-5 auto-rows-max">
          <Area id="leftSide" type={type} noOuter />
        </div>
        <div className="col-span-1 grid grid-cols-1 gap-5 auto-rows-max">
          <Area id="rightSide" type={type} noOuter />
        </div>
      </div>
      <FormButtons formId="widgetNewForm" cancelUrl={gridUrl} />
    </Form>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "createWidget")
    gridUrl: url(routeId: "widgetGrid")
    type: widgetType(code: getContextValue('type')) {
      code
      description
      settingComponent
      defaultSetting
    }
  }
`;

import { FormButtons } from '@components/admin/FormButtons.js';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import React from 'react';

interface AttributeEditFormProps {
  action: string;
  gridUrl: string;
}
export default function AttributeEditForm({
  action,
  gridUrl
}: AttributeEditFormProps) {
  return (
    <Form
      action={action}
      method="PATCH"
      id="attributeEditForm"
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
      <FormButtons formId="attributeEditForm" cancelUrl={gridUrl} />
    </Form>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "updateAttribute", params: [{key: "id", value: getContextValue("attributeUuid")}]),
    gridUrl: url(routeId: "attributeGrid")
  }
`;

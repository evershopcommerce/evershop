import { FormButtons } from '@components/admin/FormButtons.js';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import React from 'react';

interface LandingPageEditFormProps {
  action: string;
  gridUrl: string;
}

export default function LandingPageEditForm({
  action,
  gridUrl
}: LandingPageEditFormProps) {
  return (
    <Form
      method="PATCH"
      action={action}
      submitBtn={false}
      id="landingPageEditForm"
    >
      <div className="grid grid-cols-3 gap-x-5 grid-flow-row">
        <div className="col-span-2 grid grid-cols-1 gap-5 auto-rows-max">
          <Area id="leftSide" noOuter />
        </div>
        <div className="col-span-1 grid grid-cols-1 gap-5 auto-rows-max">
          <Area id="rightSide" noOuter />
        </div>
      </div>
      <FormButtons cancelUrl={gridUrl} formId="landingPageEditForm" />
    </Form>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "updateLandingPage", params: [{key: "id", value: getContextValue("landingPageUuid")}]),
    gridUrl: url(routeId: "landingPageGrid")
  }
`;

import { FormButtons } from '@components/admin/FormButtons.js';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import { toast } from '@components/common/ui/Sonner.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface LandingPageNewFormProps {
  action: string;
  gridUrl: string;
}

export default function LandingPageNewForm({
  action,
  gridUrl
}: LandingPageNewFormProps) {
  return (
    <Form
      action={action}
      method="POST"
      id="landingPageNewForm"
      onSuccess={(response) => {
        toast.success(_('Landing page created successfully!'));
        const editUrl = response.data.links.find(
          (link) => link.rel === 'edit'
        ).href;
        window.location.href = editUrl;
      }}
      submitBtn={false}
    >
      <div className="grid grid-cols-3 gap-x-5 grid-flow-row">
        <div className="col-span-2 grid grid-cols-1 gap-5 auto-rows-max">
          <Area id="leftSide" noOuter />
        </div>
        <div className="col-span-1 grid grid-cols-1 gap-5 auto-rows-max">
          <Area id="rightSide" noOuter />
        </div>
      </div>
      <FormButtons cancelUrl={gridUrl} formId="landingPageNewForm" />
    </Form>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "createLandingPage")
    gridUrl: url(routeId: "landingPageGrid")
  }
`;

import { Card } from '@components/admin/Card.js';
import { FormButtons } from '@components/admin/FormButtons.js';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import React from 'react';

interface CouponEditFormProps {
  action: string;
  gridUrl: string;
}
export default function CouponEditForm({
  action,
  gridUrl
}: CouponEditFormProps) {
  return (
    <Form method="PATCH" action={action} submitBtn={false} id="couponEditForm">
      <div className="grid grid-cols-1 gap-5">
        <Card title="General">
          <Card.Session>
            <Area id="couponEditGeneral" noOuter />
          </Card.Session>
        </Card>
        <Card title="Discount Type">
          <Card.Session>
            <Area id="couponEditDiscountType" noOuter />
          </Card.Session>
        </Card>
        <div className="grid grid-cols-3 gap-x-5 grid-flow-row ">
          <div className="col-span-2 grid grid-cols-1 gap-5 auto-rows-max">
            <Card title="Order conditions">
              <Card.Session>
                <Area id="couponEditLeft" noOuter className="col-8" />
              </Card.Session>
            </Card>
          </div>
          <div className="col-span-1 grid grid-cols-1 gap-5 auto-rows-max">
            <Card title="Customer conditions">
              <Card.Session>
                <Area id="couponEditRight" className="col-4" noOuter />
              </Card.Session>
            </Card>
          </div>
        </div>
      </div>
      <FormButtons cancelUrl={gridUrl} formId="couponEditForm" />
    </Form>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "updateCoupon", params: [{key: "id", value: getContextValue("couponUuid")}]),
    gridUrl: url(routeId: "couponGrid")
  }
`;

import { FormButtons } from '@components/admin/FormButtons.js';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
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
        <Card>
          <CardHeader>
            <CardTitle>{_('General Information')}</CardTitle>
            <CardDescription>
              {_('The general information about the coupon.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Area id="couponEditGeneral" noOuter />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{_('Discount Type')}</CardTitle>
            <CardDescription>
              {_('The type of discount applied by the coupon.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Area id="couponEditDiscountType" noOuter />
          </CardContent>
        </Card>
        <div className="grid grid-cols-3 gap-x-5 grid-flow-row ">
          <div className="col-span-2 grid grid-cols-1 gap-5 auto-rows-max">
            <Card>
              <CardHeader>
                <CardTitle>{_('Order conditions')}</CardTitle>
                <CardDescription>
                  {_(
                    'The conditions related to the order for the coupon to be applied.'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Area id="couponEditLeft" noOuter className="col-8" />
              </CardContent>
            </Card>
          </div>
          <div className="col-span-1 grid grid-cols-1 gap-5 auto-rows-max">
            <Card>
              <CardHeader>
                <CardTitle>{_('Customer conditions')}</CardTitle>
                <CardDescription>
                  {_(
                    'The conditions related to the customer for the coupon to be applied.'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Area id="couponEditRight" className="col-4" noOuter />
              </CardContent>
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

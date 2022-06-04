import React from 'react';
import { Form } from '../../../../../../lib/components/form/Form';
import Area from '../../../../../../lib/components/Area';
import { get } from '../../../../../../lib/util/get';
import { getComponents } from '../../../../../../lib/components/getComponents';
import { Card } from '../../../../../cms/views/admin/Card';
import { toast } from 'react-toastify';
import Button from '../../../../../../lib/components/form/Button';
import General from './General';
import { OrderCondition } from './OrderCondition';
import { CustomerCondition } from './CustomerCondition';
import { useAppState } from '../../../../../../lib/context/app';
import { DiscountType } from './DiscountType';

export default function CouponForm({ id, isJSON, action, gridUrl }) {
  const coupon = get(useAppState(), 'coupon', {});
  let user_condition = {};
  if (coupon.user_condition) {
    try {
      user_condition = JSON.parse(coupon.user_condition);
    } catch (e) {
      user_condition = {};
    }
  }

  return (
    <Form
      method={coupon.coupon_id ? 'PUT' : 'POST'}
      isJSON={isJSON}
      action={coupon.coupon_id ? `${action}/${coupon.coupon_id}` : action}
      submitBtn={false}
      onSuccess={(response) => {
        if (get(response, 'success') === true) {
          toast.success(get(response, 'message', 'Coupon was created successfully'));
        } else {
          toast.error(get(response, 'message', 'Something wrong. Please try again'));
        }
      }}
      onError={() => {
        toast.error('Something wrong. Please reload the page!');
      }}
      id={id}
    >
      <div className='grid grid-cols-1 gap-2'>
        <Card
          title="General"
        >
          <Card.Session>
            <General />
          </Card.Session>
        </Card>
        <Card
          title="Discount Type"
        >
          <Card.Session>
            <DiscountType />
          </Card.Session>
        </Card>
        <div className="grid grid-cols-3 gap-x-2 grid-flow-row ">
          <div className="col-span-2 grid grid-cols-1 gap-2 auto-rows-max">
            <Card title="Order conditions">
              <Card.Session>
                <Area
                  id="couponEditLeft"
                  noOuter
                  className="col-8"
                  coreComponents={[
                    {
                      component: { default: OrderCondition },
                      props: {},
                      sortOrder: 10,
                      id: 'couponOrderCondition'
                    }
                  ]}
                  components={getComponents()}
                />
              </Card.Session>
            </Card>
          </div>
          <div className="col-span-1 grid grid-cols-1 gap-2 auto-rows-max">
            <Card
              title="Customer conditions"
            >
              <Card.Session>
                <Area
                  id="couponEditRight"
                  className="col-4"
                  coreComponents={[
                    {
                      component: { default: CustomerCondition },
                      props: {},
                      sortOrder: 25,
                      id: 'couponCustomerCondition'
                    }
                  ]}
                  noOuter
                  components={getComponents()}
                />
              </Card.Session>
            </Card>
          </div>
        </div>
      </div>
      <div className="form-submit-button flex border-t border-divider mt-15 pt-15 justify-between">
        <Button
          title="Cancel"
          variant="critical"
          outline
          onAction={
            () => {
              window.location = gridUrl;
            }
          }
        />
        <Button
          title="Save"
          onAction={
            () => { document.getElementById(id).dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); }
          }
        />
      </div>
    </Form>
  );
}

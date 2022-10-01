import React from 'react';
import { Form } from '../../../lib/components/form/Form';
import Area from '../../../lib/components/Area';
import { get } from '../../../lib/util/get';
import { toast } from 'react-toastify';
import Button from '../../../lib/components/form/Button';
import { Card } from '../../cms/components/admin/Card';
import './CouponForm.scss';

export default function CouponForm({ method, isJSON, action, gridUrl }) {
  const id = "couponForm";
  return (
    <Form
      method={method}
      isJSON={isJSON}
      action={action}
      submitBtn={false}
      onSuccess={(response) => {
        if (get(response, 'success') === true) {
          toast.success(get(response, 'message', 'Coupon was created successfully'));
          setTimeout(() => { window.location = gridUrl }, 300);
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
            <Area
              id="couponEditGeneral"
              noOuter
            />
          </Card.Session>
        </Card>
        <Card
          title="Discount Type"
        >
          <Card.Session>
            <Area
              id="couponEditDiscountType"
              noOuter
            />
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
                  noOuter
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

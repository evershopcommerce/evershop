import PropTypes from "prop-types"
import React from 'react';
import { toast } from "react-toastify";
import { get } from '../../../../../lib/util/get';
import { Field } from '../../../../../lib/components/form/Field';
import { useAppState } from '../../../../../lib/context/app';
import { Form } from "../../../../../lib/components/form/Form";
import { Hidden } from "../../../../../lib/components/form/fields/Hidden";
import Button from "../../../../../lib/components/form/Button";

export default function CouponForm({ applyApi }) {
  const context = useAppState();
  const cart = get(context, 'cart', {});
  if (cart.items === undefined || cart.items.length === 0) { return null; }

  return <div className="mt-4">
    <Form
      method={'POST'}
      isJSON={true}
      action={applyApi}
      submitBtn={false}
      onSuccess={(response) => {
        if (get(response, 'success') === true) {
          location.reload();
        } else {
          toast.error('Invalid coupon');
        }
      }}
      onError={() => {
        toast.error('Something wrong. Please reload the page!');
      }}
      id={'couponForm'}
    >
      <p style={{ fontWeight: 600 }}>Promotion code?</p>
      <div className="grid grid-cols-3 gap-2" style={{ width: '300px' }}>
        <div className="col-span-2">
          <Field
            type='text'
            name='coupon'
            placeholder='Enter coupon code'
          />
          <Hidden name='cart_id' value={get(context, 'cart.cart_id', null)} />
        </div>
        <div className="col-span-1">
          <Button
            title="Apply"
            onAction={
              () => { document.getElementById('couponForm').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); }
            }
          />
        </div>
      </div>
    </Form>
  </div>;
}
CouponForm.propTypes = {
  applyApi: PropTypes.string.isRequired
}

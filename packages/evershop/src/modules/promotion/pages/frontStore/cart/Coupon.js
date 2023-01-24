import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';
import { get } from '../../../../../lib/util/get';
import { Field } from '../../../../../lib/components/form/Field';
import { Form } from '../../../../../lib/components/form/Form';
import { Hidden } from '../../../../../lib/components/form/fields/Hidden';
import Button from '../../../../../lib/components/form/Button';

export default function CouponForm({ cart: { applyCouponApi } }) {
  return (
    <div className="mt-4">
      <Form
        method="POST"
        isJSON
        action={applyCouponApi}
        submitBtn={false}
        onSuccess={(response) => {
          if (!response.error) {
            toast.success('Coupon applied successfully!');
            // Wait for 1.5 second to reload the page
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            toast.error('Invalid coupon');
          }
        }}
        onError={() => {
          toast.error('Something wrong. Please reload the page!');
        }}
        id="couponForm"
      >
        <p style={{ fontWeight: 600 }}>Promotion code?</p>
        <div className="grid grid-cols-3 gap-2" style={{ width: '300px' }}>
          <div className="col-span-2">
            <Field
              type="text"
              name="coupon"
              placeholder="Enter coupon code"
            />
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
    </div>
  );
}

CouponForm.propTypes = {
  cart: PropTypes.shape({
    applyCouponApi: PropTypes.string.isRequired
  })
};

export const layout = {
  areaId: 'shoppingCartLeft',
  sortOrder: 20
};

export const query = `
  query Query {
    cart {
      applyCouponApi
    }
  }
`;

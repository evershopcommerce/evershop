import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';
import { Field } from '../../../../../lib/components/form/Field';
import { Form } from '../../../../../lib/components/form/Form';
import Button from '../../../../../lib/components/form/Button';
import { useAppDispatch } from '../../../../../lib/context/app';

export default function CouponForm({ cart: { applyCouponApi } }) {
  const AppContextDispatch = useAppDispatch();

  return (
    <div className="mt-4">
      <Form
        method="POST"
        isJSON
        action={applyCouponApi}
        submitBtn={false}
        onSuccess={async (response) => {
          if (!response.error) {
            const currentUrl = window.location.href;
            const url = new URL(currentUrl, window.location.origin);
            url.searchParams.set('ajax', true);
            await AppContextDispatch.fetchPageData(url);
            toast.success('Coupon applied successfully!');
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
  }).isRequired
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

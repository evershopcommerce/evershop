import Button from '@components/common/Button.js';
import { useAppDispatch } from '@components/common/context/app.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import React from 'react';
import { toast } from 'react-toastify';
import { _ } from '../../../../../lib/locale/translate/_.js';

interface CouponFormProps {
  cart: {
    applyCouponApi: string;
  };
}
export default function CouponForm({
  cart: { applyCouponApi }
}: CouponFormProps) {
  const AppContextDispatch = useAppDispatch();
  return (
    <div className="mt-10">
      <Form
        method="POST"
        action={applyCouponApi}
        submitBtn={false}
        onSuccess={async (response) => {
          if (!response.error) {
            const currentUrl = window.location.href;
            const url = new URL(currentUrl, window.location.origin);
            url.searchParams.set('ajax', 'true');
            await AppContextDispatch.fetchPageData(url);
            toast.success(_('Coupon applied successfully!'));
          } else {
            toast.error(_('Invalid coupon'));
          }
        }}
        onError={() => {
          toast.error(_('Something wrong. Please reload the page!'));
        }}
        id="couponForm"
      >
        <p style={{ fontWeight: 600 }}>{_('Promotion code?')}</p>
        <div className="grid grid-cols-3 gap-5" style={{ width: '300px' }}>
          <div className="col-span-2">
            <InputField name="coupon" placeholder={_('Enter coupon code')} />
          </div>
          <div className="col-span-1">
            <Button
              title={_('Apply')}
              onAction={() => {
                (
                  document.getElementById('couponForm') as HTMLFormElement
                ).dispatchEvent(
                  new Event('submit', { cancelable: true, bubbles: true })
                );
              }}
            />
          </div>
        </div>
      </Form>
    </div>
  );
}

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

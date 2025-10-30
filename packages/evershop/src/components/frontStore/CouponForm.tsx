import Button from '@components/common/Button.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import {
  Coupon,
  CouponActions,
  CouponState
} from '@components/frontStore/Coupon.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

export function CouponForm() {
  const form = useForm<{ coupon: string }>();
  const coupon = form.watch('coupon');
  return (
    <Coupon
      onApplySuccess={() => {
        toast.success(_('Coupon applied successfully!'));
      }}
      onError={() => {
        toast.error(_('Invalid coupon'));
      }}
      onRemoveSuccess={() => {
        toast.success(_('Coupon removed successfully!'));
      }}
    >
      {(state: CouponState, actions: CouponActions) => (
        <div className="coupon-form">
          <Form form={form} method="POST" submitBtn={false}>
            <div className="flex justify-between gap-3">
              <div className="w-4/5">
                <InputField
                  name="coupon"
                  required
                  validation={{
                    required: {
                      value: true,
                      message: _('Coupon code is required')
                    }
                  }}
                  defaultValue={state.appliedCoupon || ''}
                  disabled={!!state.appliedCoupon}
                  placeholder={_('Enter coupon code')}
                  wrapperClassName="mb-0 form-field"
                />
              </div>
              <div className="col-span-1">
                <Button
                  title={state.appliedCoupon ? _('Remove') : _('Apply')}
                  isLoading={state.isLoading}
                  onAction={async () => {
                    if (state.appliedCoupon) {
                      await actions.removeCoupon();
                    } else {
                      const isValid = await form.trigger();
                      if (isValid) {
                        actions.applyCoupon(coupon);
                      }
                    }
                  }}
                  variant={state.appliedCoupon ? 'danger' : 'primary'}
                  className="text-base"
                />
              </div>
            </div>
          </Form>
        </div>
      )}
    </Coupon>
  );
}

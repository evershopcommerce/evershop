import Area from '@components/common/Area';
import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import './CheckoutSuccess.scss';

export default function CheckoutSuccessPage() {
  return (
    <div className="checkout-success mx-auto max-w-2xl py-10">
      <Area id="checkoutSuccessPageLeft" />
      <Area id="checkoutSuccessPageRight" />
      <div className="mt-8 text-center">
        <Button
          variant="default"
          size="lg"
          onClick={() => (window.location.href = '/')}
          title={_('Continue shopping')}
        >
          {_('Continue shopping')}
        </Button>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

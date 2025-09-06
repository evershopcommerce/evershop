import Area from '@components/common/Area.js';
import { CheckoutProvider } from '@components/common/context/checkout.js';
import { Form } from '@components/common/form/Form.js';
import { CartItems } from '@components/frontStore/CartItems.js';
import { CartSummaryItemsList } from '@components/frontStore/CartSummaryItems.js';
import { CartTotalSummary } from '@components/frontStore/CartTotalSummary.js';
import { CheckoutButton } from '@components/frontStore/checkout/CheckoutButton.js';
import { ContactInformation } from '@components/frontStore/checkout/ContactInformation.js';
import { Payment } from '@components/frontStore/checkout/Payment.js';
import { Shipment } from '@components/frontStore/checkout/Shipment.js';
import React from 'react';
import './Checkout.scss';
import { useForm } from 'react-hook-form';
import { _ } from '../../../../../lib/locale/translate/_.js';

interface CheckoutPageProps {
  setting: {
    priceIncludingTax: boolean;
  };
  placeOrderApi: string;
  getPaymentMethodApi: string;
  getShippingMethodApi: string;
  checkoutSuccessUrl: string;
}

export default function CheckoutPage({
  setting,
  placeOrderApi,
  checkoutSuccessUrl
}: CheckoutPageProps) {
  const [disabled, setDisabled] = React.useState(false);
  const form = useForm({
    disabled: disabled,
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: {}
  });

  return (
    <CheckoutProvider
      form={form}
      enableForm={() => setDisabled(false)}
      disableForm={() => setDisabled(true)}
      allowGuestCheckout={true}
      placeOrderApi={placeOrderApi}
      checkoutSuccessUrl={checkoutSuccessUrl}
    >
      <div className="page-width grid grid-cols-1 md:grid-cols-2 gap-7">
        <Form form={form} submitBtn={false}>
          <div>
            <ContactInformation />
            <Shipment />
            <Payment />
            <CheckoutButton />
          </div>
          <Area id="checkoutForm" noOuter />
        </Form>
        <div>
          <CartItems productPriceInclTax={setting.priceIncludingTax}>
            {({ items, loading }) => (
              <CartSummaryItemsList items={items} loading={loading} />
            )}
          </CartItems>
          <CartTotalSummary showPriceIncludingTax={true} />
        </div>
      </div>
    </CheckoutProvider>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    setting {
      priceIncludingTax
    }
    placeOrderApi: url(routeId: "createOrder")
    checkoutSuccessUrl: url(routeId: "checkoutSuccess")
  }
`;

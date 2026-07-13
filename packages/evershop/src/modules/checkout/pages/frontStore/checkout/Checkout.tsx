import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import { CartItems } from '@components/frontStore/cart/CartItems.js';
import { CartSummaryItemsList } from '@components/frontStore/cart/CartSummaryItems.js';
import { CartTotalSummary } from '@components/frontStore/cart/CartTotalSummary.js';
import { CheckoutButton } from '@components/frontStore/checkout/CheckoutButton.js';
import { CheckoutProvider } from '@components/frontStore/checkout/CheckoutContext.js';
import { ContactInformation } from '@components/frontStore/checkout/ContactInformation.js';
import { Payment } from '@components/frontStore/checkout/Payment.js';
import { Shipment } from '@components/frontStore/checkout/Shipment.js';
import { ShippingNote } from '@components/frontStore/checkout/ShippingNote.js';
import { useCustomer } from '@components/frontStore/customer/CustomerContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useForm } from 'react-hook-form';
import './Checkout.scss';

interface CheckoutPageProps {
  placeOrderApi: string;
  getPaymentMethodApi: string;
  getShippingMethodApi: string;
  checkoutSuccessUrl: string;
  loginUrl: string;
  setting: {
    showShippingNote: boolean;
    allowGuestCheckout: boolean;
  };
}

export default function CheckoutPage({
  placeOrderApi,
  checkoutSuccessUrl,
  loginUrl,
  setting: { showShippingNote, allowGuestCheckout }
}: CheckoutPageProps) {
  const { customer } = useCustomer();
  // The server middleware gates the initial page load. This handles a *logout while on the
  // checkout page* (client-side, no reload): when guest checkout is disabled and a shopper who
  // was signed in becomes anonymous, send them back to login with a return to checkout. The ref
  // ensures we only act on a real logout (was authenticated → not), never on first load.
  const wasAuthenticated = React.useRef(false);
  React.useEffect(() => {
    if (customer) {
      wasAuthenticated.current = true;
      return;
    }
    if (!allowGuestCheckout && wasAuthenticated.current) {
      window.location.href = `${loginUrl}?redirect=${encodeURIComponent(
        window.location.pathname + window.location.search
      )}`;
    }
  }, [customer, allowGuestCheckout, loginUrl]);
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
      allowGuestCheckout={allowGuestCheckout}
      placeOrderApi={placeOrderApi}
      checkoutSuccessUrl={checkoutSuccessUrl}
    >
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">
        {_('Checkout')}
      </h1>
      <div className="grid grid-cols-1 gap-8 pb-16 lg:grid-cols-[1fr_400px]">
        <Form form={form} submitBtn={false}>
          <Area id="checkoutFormBefore" noOuter />
          {/* No `space-y-*` here: the sections emit empty <Area> wrapper divs,
              so space-y would give the first visible card a top margin that
              collapses out through the <fieldset> and drops the whole column ~24px
              below the summary. Each section carries its own `mt-6` instead. */}
          <div className="checkout-steps">
            <ContactInformation />
            <Shipment />
            <Payment />
            <CheckoutButton />
          </div>
          <Area id="checkoutForm" noOuter />
          <Area id="checkoutFormAfter" noOuter />
        </Form>
        <div className="h-fit space-y-6 lg:sticky lg:top-8">
          {showShippingNote && <ShippingNote />}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 h4">{_('Order summary')}</h2>
            <CartItems>
              {({ items, loading, showPriceIncludingTax }) => (
                <CartSummaryItemsList
                  items={items}
                  loading={loading}
                  showPriceIncludingTax={showPriceIncludingTax}
                />
              )}
            </CartItems>
            <div className="mt-4">
              <CartTotalSummary />
            </div>
          </div>
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
    placeOrderApi: url(routeId: "createOrder")
    checkoutSuccessUrl: url(routeId: "checkoutSuccess")
    loginUrl: url(routeId: "login")
    setting {
      showShippingNote
      allowGuestCheckout
    }
  }
`;

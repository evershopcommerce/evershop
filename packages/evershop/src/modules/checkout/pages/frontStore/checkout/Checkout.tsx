import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@components/common/ui/Collapsible.js';
import { Skeleton } from '@components/common/ui/Skeleton.js';
import { useCartState } from '@components/frontStore/cart/CartContext.js';
import { CheckoutProvider } from '@components/frontStore/checkout/CheckoutContext.js';
import { OrderSummaryContent } from '@components/frontStore/checkout/OrderSummaryContent.js';
import { useCustomer } from '@components/frontStore/customer/CustomerContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { ChevronDown } from 'lucide-react';
import React from 'react';
import { useForm } from 'react-hook-form';
import './Checkout.scss';

/**
 * Below `lg` the summary rail is hidden, and this sticky disclosure bar takes
 * its place above the form: collapsed it shows only the label and the grand
 * total; expanded it reveals the full summary (items, coupon, totals) in a
 * panel that scrolls internally so the bar itself never grows past the
 * viewport. The `-mx-4` bleeds the bar through `.page-width`'s 1rem gutter so
 * it spans edge to edge while stuck.
 */
function MobileOrderSummary() {
  const { data: cart, loadingStates } = useCartState();
  const updating = Object.values(loadingStates).some(
    (state) => state === true || (typeof state === 'string' && state !== null)
  );
  return (
    <Collapsible className="checkout-mobile-summary sticky top-0 z-20 -mx-4 mb-8 border-y border-border bg-card lg:hidden">
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-4 px-4 py-3 text-left">
        <span className="flex items-center gap-1 text-sm font-medium">
          {_('Order summary')}
          <ChevronDown
            className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-aria-expanded:rotate-180"
            aria-hidden="true"
          />
        </span>
        {updating ? (
          <Skeleton className="h-5 w-16" />
        ) : (
          <span className="text-base font-semibold tabular-nums">
            {cart?.grandTotal?.text || ''}
          </span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-starting-style:h-0 data-ending-style:h-0">
        <div className="max-h-[60vh] overflow-y-auto border-t border-border px-4 py-4">
          <OrderSummaryContent />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface CheckoutPageProps {
  placeOrderApi: string;
  getPaymentMethodApi: string;
  getShippingMethodApi: string;
  checkoutSuccessUrl: string;
  loginUrl: string;
  setting: {
    allowGuestCheckout: boolean;
  };
}

/**
 * Checkout page shell. It owns the checkout query, the form, the
 * `CheckoutProvider`, the title, the mobile summary bar, the two-column grid
 * and the slots (Areas); the steps and the summary rail are sibling page
 * blocks registering into those slots, so a theme can re-position them from
 * `layouts.json` without overriding this file:
 *
 *   checkout/CheckoutContact       → checkoutSteps   10  (inside the form)
 *   checkout/CheckoutShipment      → checkoutSteps   20  (inside the form)
 *   checkout/CheckoutPayment       → checkoutSteps   30  (inside the form)
 *   checkout/CheckoutShippingNote  → checkoutSteps   40  (mobile copy of the note, inside the form)
 *   checkout/CheckoutPlaceOrder    → checkoutSteps   50  (works anywhere inside the provider, e.g. the rail)
 *   checkout/CheckoutSummary       → checkoutSummary 10  (desktop rail: note + order summary card)
 *
 * The step blocks register fields on this form, so they must stay inside it
 * (`checkoutFormBefore`, `checkoutSteps`, `checkoutForm`, `checkoutFormAfter`).
 */
export default function CheckoutPage({
  placeOrderApi,
  checkoutSuccessUrl,
  loginUrl,
  setting: { allowGuestCheckout }
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
      <MobileOrderSummary />
      <div className="grid grid-cols-1 gap-8 pb-16 lg:grid-cols-[1fr_400px]">
        <Form form={form} submitBtn={false}>
          <Area id="checkoutFormBefore" noOuter />
          {/* No `space-y-*` here: the sections emit empty <Area> wrapper divs,
              so space-y would give the first visible card a top margin that
              collapses out through the <fieldset> and drops the whole column ~24px
              below the summary. Each section carries its own `mt-6` instead. */}
          <div className="checkout-steps">
            <Area id="checkoutSteps" noOuter />
          </div>
          <Area id="checkoutForm" noOuter />
          <Area id="checkoutFormAfter" noOuter />
        </Form>
        <div className="hidden h-fit space-y-6 lg:sticky lg:top-8 lg:block">
          <Area id="checkoutSummary" noOuter />
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
      allowGuestCheckout
    }
  }
`;

import { toast } from '@components/common/ui/Sonner.js';
import { useCartState } from '@components/frontStore/cart/CartContext.js';
import {
  useCheckout,
  useCheckoutDispatch
} from '@components/frontStore/checkout/CheckoutContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { ApiResponse } from '@evershop/evershop/types/apiResponse';
import type {
  PayPalButtonsComponent,
  PayPalNamespace
} from '@paypal/paypal-js';
import React, { useEffect, useRef, useState } from 'react';

interface VenmoSdkConfig {
  clientId: string;
  currency: string;
  intent: string;
  sandbox: boolean;
}

interface VenmoMethodProps {
  createOrderAPI: string;
  setting: {
    paypalVenmoDisplayName: string;
    paypalClientId: string;
    paypalPaymentIntent: string;
    paypalEnvironment: string;
  };
}

// Own namespace so the script never clobbers a `window.paypal` another
// extension loaded with different parameters.
const SDK_NAMESPACE = 'evershopVenmo';
const sdkPromises: Record<string, Promise<PayPalNamespace>> = {};

function loadVenmoSdk({
  clientId,
  currency,
  intent,
  sandbox
}: VenmoSdkConfig): Promise<PayPalNamespace> {
  const params = new URLSearchParams({
    'client-id': clientId,
    components: 'buttons',
    'enable-funding': 'venmo',
    currency,
    intent: intent.toLowerCase()
  });
  if (sandbox) {
    // Venmo is only eligible for US buyers; sandbox has no real buyer location.
    params.set('buyer-country', 'US');
  }
  const src = `https://www.paypal.com/sdk/js?${params.toString()}`;
  if (!sdkPromises[src]) {
    sdkPromises[src] = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.setAttribute('data-namespace', SDK_NAMESPACE);
      script.onload = () =>
        resolve((window as any)[SDK_NAMESPACE] as PayPalNamespace);
      script.onerror = () => {
        delete sdkPromises[src];
        script.remove();
        reject(new Error(_('Failed to load Venmo')));
      };
      document.head.appendChild(script);
    });
  }
  return sdkPromises[src];
}

function VenmoLogo() {
  return (
    <svg
      width="70"
      height="14"
      viewBox="0 0 512 100"
      role="presentation"
      aria-hidden="true"
    >
      <text
        x="0"
        y="84"
        fill="#008CFF"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="112"
        fontStyle="italic"
        fontWeight="bold"
      >
        venmo
      </text>
    </svg>
  );
}

function VenmoCheckoutButton({
  createOrderAPI,
  sdkConfig
}: {
  createOrderAPI: string;
  sdkConfig: VenmoSdkConfig;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { form } = useCheckout();
  const { checkout } = useCheckoutDispatch();
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>(
    'loading'
  );
  // The SDK keeps the callbacks from its first render; read the latest values
  // through refs instead of re-rendering the button on every context change.
  const checkoutRef = useRef(checkout);
  checkoutRef.current = checkout;
  const formRef = useRef(form);
  formRef.current = form;
  const urlsRef = useRef<{ returnUrl?: string; cancelUrl?: string }>({});
  const orderPlacedRef = useRef(false);

  useEffect(() => {
    let buttons: PayPalButtonsComponent | undefined;
    let disposed = false;

    loadVenmoSdk(sdkConfig)
      .then((paypal) => {
        if (disposed || !paypal?.Buttons || !containerRef.current) {
          return;
        }
        buttons = paypal.Buttons({
          fundingSource: paypal.FUNDING?.VENMO,
          style: { height: 48 },
          // Validate before the popup opens, so an incomplete form never
          // creates an order.
          onClick: async (_data, actions) => {
            const isValid = await formRef.current.trigger(undefined, {
              shouldFocus: true
            });
            return isValid ? actions.resolve() : actions.reject();
          },
          createOrder: async () => {
            // Order first, pay second: place the EverShop order, then create
            // the PayPal order bound to it on the server.
            const order = await checkoutRef.current();
            if (!order?.uuid) {
              throw new Error(_('Failed to place order. Please try again.'));
            }
            orderPlacedRef.current = true;
            const response = await fetch(createOrderAPI, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ order_id: order.uuid })
            });
            const json = (await response.json()) as ApiResponse<{
              paypalOrderId: string;
              returnUrl: string;
              cancelUrl: string;
            }>;
            if (json.error) {
              throw new Error(json.error.message);
            }
            urlsRef.current = {
              returnUrl: json.data.returnUrl,
              cancelUrl: json.data.cancelUrl
            };
            return json.data.paypalOrderId;
          },
          // The return page captures/authorizes and records the payment —
          // the same path a PayPal redirect lands on.
          onApprove: async () => {
            window.location.href = urlsRef.current.returnUrl as string;
          },
          // The order is already placed: the cancel page cancels it, restocks
          // and hands the cart back.
          onCancel: () => {
            if (urlsRef.current.cancelUrl) {
              window.location.href = urlsRef.current.cancelUrl;
            }
          },
          onError: (err) => {
            if (urlsRef.current.cancelUrl) {
              window.location.href = urlsRef.current.cancelUrl;
              return;
            }
            toast.error(
              (typeof err?.message === 'string' && err.message) ||
                _('Failed to place order. Please try again.')
            );
            if (orderPlacedRef.current) {
              // The order exists but has no PayPal order to cancel against.
              // Reload so checkout restarts from the cart's real state (the
              // server re-activates it when PayPal refuses the order); the
              // pending order left behind is cancelled by the reconciliation
              // cron.
              setTimeout(() => window.location.reload(), 2000);
            }
          }
        });
        if (!buttons.isEligible()) {
          setState('unavailable');
          return;
        }
        buttons.render(containerRef.current).then(() => {
          if (!disposed) {
            setState('ready');
          }
        });
      })
      .catch(() => {
        if (!disposed) {
          setState('unavailable');
        }
      });

    return () => {
      disposed = true;
      buttons?.close().catch(() => undefined);
    };
  }, [
    createOrderAPI,
    sdkConfig.clientId,
    sdkConfig.currency,
    sdkConfig.intent,
    sdkConfig.sandbox
  ]);

  return (
    <div>
      {state === 'loading' && (
        <div className="h-12 w-full rounded-lg bg-muted animate-pulse" />
      )}
      {state === 'unavailable' && (
        <div className="text-center text-muted-foreground py-3">
          {_(
            'Venmo is not available for this purchase. Please choose another payment method.'
          )}
        </div>
      )}
      <div ref={containerRef} className={state === 'ready' ? '' : 'hidden'} />
    </div>
  );
}

export default function VenmoMethod({
  createOrderAPI,
  setting: {
    paypalVenmoDisplayName,
    paypalClientId,
    paypalPaymentIntent,
    paypalEnvironment
  }
}: VenmoMethodProps) {
  const { registerPaymentComponent } = useCheckoutDispatch();
  const { data: cart } = useCartState();
  const currency = cart?.currency || 'USD';

  useEffect(() => {
    const sdkConfig: VenmoSdkConfig = {
      clientId: paypalClientId,
      currency,
      intent: paypalPaymentIntent || 'CAPTURE',
      sandbox: (paypalEnvironment || '').includes('sandbox')
    };
    registerPaymentComponent('venmo', {
      nameRenderer: () => (
        <div className="flex items-center justify-between w-full">
          <span>{paypalVenmoDisplayName}</span>
          <VenmoLogo />
        </div>
      ),
      formRenderer: () => (
        <div className="flex justify-center text-muted-foreground">
          <div className="w-2/3 text-center py-3">
            {_('Click the Venmo button below to complete your payment.')}
          </div>
        </div>
      ),
      checkoutButtonRenderer: () => (
        <VenmoCheckoutButton
          createOrderAPI={createOrderAPI}
          sdkConfig={sdkConfig}
        />
      )
    });
  }, [
    registerPaymentComponent,
    paypalVenmoDisplayName,
    paypalClientId,
    paypalPaymentIntent,
    paypalEnvironment,
    currency,
    createOrderAPI
  ]);

  return null;
}

export const layout = {
  areaId: 'checkoutFormAfter',
  sortOrder: 11
};

export const query = `
  query Query {
    setting {
      paypalVenmoDisplayName
      paypalClientId
      paypalPaymentIntent
      paypalEnvironment
    }
    createOrderAPI: url(routeId: "paypalCreateOrder")
  }
`;

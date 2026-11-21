import '../../../customer/address/tests/unit/domSetup.js';
import { jest, describe, it, expect, afterEach } from '@jest/globals';
import { deriveAddressSchema } from '@evershop/evershop/lib/address/derive';
import type { AddressGraphql } from '@evershop/evershop/types/address';
import { US } from '../../../../../lib/address/tests/unit/addressFixtures.js';
import { appState } from '../../../customer/address/tests/unit/domSetup.js';

/**
 * Issue #1175. The billing address form and a payment method's form sit
 * inside `ItemDescription`, which clamps its text to two lines
 * (`line-clamp-2`: a `-webkit-box` with `-webkit-line-clamp: 2`). Grids and
 * flex boxes escape the clamp, so the inputs looked fine, but the address
 * preview is plain text: it was cut after its second line ("…"), its box
 * stopped there, and "Continue to payment" covered the rest. jsdom has no
 * layout, so these tests check the cause: nothing above the form clamps.
 */
const us = deriveAddressSchema({ country: 'US', record: US, locale: 'en', regionLevels: ['administrative_area'] });

jest.unstable_mockModule('urql', () => ({
  useQuery: (opts: { query: string; variables: Record<string, unknown>; pause?: boolean }) => {
    if (opts.pause) return [{ data: undefined, fetching: false, error: undefined }];
    if (opts.query.includes('countries(')) {
      return [{ data: { countries: [{ value: 'US', label: 'United States' }] }, fetching: false, error: undefined }];
    }
    if (opts.query.includes('addressSchema(')) {
      return [{ data: { addressSchema: us }, fetching: false, error: undefined }];
    }
    if (opts.query.includes('regions(')) {
      return [{ data: { regions: [{ key: 'TX', name: 'Texas', isoCode: 'US-TX' }] }, fetching: false, error: undefined }];
    }
    return [{ data: undefined, fetching: false, error: undefined }];
  }
}));

type Form = import('react-hook-form').UseFormReturn;
const forms: Form[] = [];
const checkoutData: Record<string, unknown> = {};
const BankTransferForm = () => (
  <div className="bank-transfer-details">
    <div>Bank: First Bank</div>
    <div>Account: 0123 4567 8901</div>
    <div>Reference: your order number</div>
  </div>
);
jest.unstable_mockModule('../../CheckoutContext.js', () => ({
  useCheckout: () => ({
    form: forms[0],
    checkoutData,
    registeredPaymentComponents: { bank_transfer: { formRenderer: BankTransferForm } }
  }),
  useCheckoutDispatch: () => ({
    updateCheckoutData: (data: Record<string, unknown>) => Object.assign(checkoutData, data)
  })
}));

const React = (await import('react')).default;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { FormProvider, useForm } = await import('react-hook-form');
const { AppProvider } = await import('../../../../common/context/app.js');
const { BillingAddress } = await import('../../payment/BillingAddress.js');
const { PaymentMethods } = await import('../../payment/PaymentMethods.js');

const saved = {
  recipient: 'Ada Lovelace',
  givenName: null,
  familyName: null,
  organization: null,
  addressLine1: '1 Congress Ave',
  addressLine2: null,
  addressLine3: null,
  dependentLocality: null,
  locality: { key: 'Austin', name: 'Austin' },
  administrativeArea: { key: 'TX', name: 'Texas', isoCode: 'US-TX' },
  postalCode: '73301',
  sortingCode: null,
  country: { code: 'US', name: 'United States' },
  telephone: '+15125550100',
  extra: null,
  formatted: ['Ada Lovelace', '1 Congress Ave', 'Austin, TX 73301', 'United States']
} as unknown as AddressGraphql;

function Harness({ children, values }: { children: React.ReactNode; values?: Record<string, unknown> }) {
  const form = useForm({ shouldUnregister: false, mode: 'onBlur', defaultValues: values });
  forms[0] = form as unknown as Form;
  return (
    <AppProvider value={appState as unknown as React.ComponentProps<typeof AppProvider>['value']}>
      <FormProvider {...form}>{children}</FormProvider>
    </AppProvider>
  );
}

describe('checkout forms inside ItemDescription are not clamped (#1175)', () => {
  let container: HTMLElement | undefined;
  let root: ReturnType<typeof createRoot> | undefined;
  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    for (const key of Object.keys(checkoutData)) delete checkoutData[key];
  });
  const mount = async (el: React.ReactElement) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(el);
    });
  };

  it('no shipping: the address preview and "Continue to payment" sit under no clamp', async () => {
    await mount(
      <Harness>
        <BillingAddress billingAddress={saved} noShippingRequired />
      </Harness>
    );
    const preview = container!.querySelector('.address-preview');
    // The saved address fills the form, so the preview has several lines.
    expect(preview?.children.length).toBeGreaterThan(2);
    expect(preview!.closest('.line-clamp-2')).toBeNull();
    const button = [...container!.querySelectorAll('button')].find((b) => b.textContent?.includes('Continue to payment'));
    expect(button!.closest('.line-clamp-2')).toBeNull();
  });

  it('with shipping: the "different billing address" form sits under no clamp', async () => {
    await mount(
      <Harness>
        <BillingAddress noShippingRequired={false} />
      </Harness>
    );
    const option = [...container!.querySelectorAll('span')].find((s) => s.textContent === 'Use a different billing address');
    await act(async () => {
      option!.click();
    });
    const field = document.getElementById('field-billingAddress.locality');
    expect(field).not.toBeNull();
    expect(field!.closest('.line-clamp-2')).toBeNull();
  });

  it("a selected payment method's form is not clamped", async () => {
    await mount(
      <Harness values={{ paymentMethod: 'bank_transfer' }}>
        <PaymentMethods methods={[{ code: 'bank_transfer', name: 'Bank transfer' }]} />
      </Harness>
    );
    const details = container!.querySelector('.bank-transfer-details');
    expect(details).not.toBeNull();
    const wrapper = details!.parentElement!;
    expect(wrapper.dataset.slot).toBe('item-description');
    expect(wrapper.classList.contains('line-clamp-2')).toBe(false);
    // The ItemDescription around the whole list still clamps; the radio
    // group between the two is a grid, and a line clamp does not count
    // lines inside a grid, so it cannot reach the method's form.
    expect(wrapper.closest('[role="radiogroup"]')!.classList.contains('grid')).toBe(true);
  });
});

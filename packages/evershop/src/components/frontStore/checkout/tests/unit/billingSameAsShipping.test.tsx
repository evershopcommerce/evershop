import '../../../customer/address/tests/unit/domSetup.js';
import { jest, describe, it, expect, afterEach } from '@jest/globals';
import { deriveAddressSchema } from '@evershop/evershop/lib/address/derive';
import { US } from '../../../../../lib/address/tests/unit/addressFixtures.js';
import { appState } from '../../../customer/address/tests/unit/domSetup.js';

/**
 * "Same as shipping address" after a reload of the checkout (theme-lab
 * FINDINGS #83). The address form pre-fills the cart's address through each
 * field's initial value and writes only the country with `setValue`; a
 * `useWatch` of `shippingAddress` can then hold `{ country }` alone. The
 * billing address used to be copied from that snapshot, so the order went
 * out with `{ country: "US" }` as its billing address and the server refused
 * it ("Full name is required, …"). It is now copied from the shipping address
 * the shipment step stores in `checkoutData` (read with `getValues` when a
 * shipping method is picked), which is the one the order sends.
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
      return [{ data: { regions: [{ key: 'CA', name: 'California', isoCode: 'US-CA' }] }, fetching: false, error: undefined }];
    }
    return [{ data: undefined, fetching: false, error: undefined }];
  }
}));

type Form = import('react-hook-form').UseFormReturn;
const forms: Form[] = [];
const checkoutData: Record<string, unknown> = {};
jest.unstable_mockModule('../../CheckoutContext.js', () => ({
  useCheckout: () => ({ form: forms[0], checkoutData }),
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

/** What the shipment step stores when a shipping method is picked. */
const shipping = {
  country: 'US',
  recipient: 'Jane Tester',
  telephone: '+14155550123',
  organization: '',
  address_line_1: '1 Infinite Loop',
  address_line_2: '',
  locality: 'Cupertino',
  administrative_area: 'US-CA',
  postal_code: '95014'
};

function Harness() {
  // After a reload, what a watch of the shipping address can hold.
  const form = useForm({
    shouldUnregister: false,
    mode: 'onBlur',
    defaultValues: { shippingAddress: { country: 'US' } }
  });
  forms[0] = form as unknown as Form;
  return (
    <AppProvider value={appState as unknown as React.ComponentProps<typeof AppProvider>['value']}>
      <FormProvider {...form}>
        <BillingAddress noShippingRequired={false} />
      </FormProvider>
    </AppProvider>
  );
}

describe('BillingAddress "Same as shipping address"', () => {
  let container: HTMLElement | undefined;
  let root: ReturnType<typeof createRoot> | undefined;
  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = undefined;
    container = undefined;
    for (const key of Object.keys(checkoutData)) delete checkoutData[key];
  });
  const render = async () => {
    if (!root) {
      container = document.createElement('div');
      document.body.appendChild(container);
      root = createRoot(container);
    }
    await act(async () => {
      root!.render(<Harness />);
    });
  };
  /** The shipment step picks a shipping method: `checkoutData.shippingAddress` changes. */
  const pickShippingMethod = async (address: Record<string, unknown>) => {
    Object.assign(checkoutData, { shippingAddress: address, shippingMethod: 'express' });
    await render();
  };
  const choose = async (label: string) => {
    const option = [...container!.querySelectorAll('span')].find((s) => s.textContent === label);
    await act(async () => {
      option!.click();
    });
  };
  /** The label of the radio shown as chosen. */
  const shownOption = () => {
    const checked = container!.querySelectorAll('[role="radio"][aria-checked="true"]');
    expect(checked).toHaveLength(1);
    return checked[0].closest('label')?.textContent?.trim();
  };

  it('after a reload, copies the shipping address the order sends, not the watched snapshot', async () => {
    await render();
    expect(shownOption()).toBe('Same as shipping address');
    // Nothing to copy until a shipping method is picked; never `{ country }` alone.
    expect(checkoutData.billingAddress).toBeUndefined();

    await pickShippingMethod(shipping);
    expect(checkoutData.billingAddress).toEqual(shipping);
    expect(shownOption()).toBe('Same as shipping address');

    // A new shipping address (picked again after an edit) is copied too.
    const moved = { ...shipping, address_line_1: '2 Infinite Loop' };
    await pickShippingMethod(moved);
    expect(checkoutData.billingAddress).toEqual(moved);
  });

  it('the radio shown always matches the billing address that is sent', async () => {
    await render();
    await pickShippingMethod(shipping);

    await choose('Use a different billing address');
    expect(shownOption()).toBe('Use a different billing address');
    expect(checkoutData.billingAddress).not.toEqual(shipping);

    // Picking a shipping method again must not put the shipping address back.
    await pickShippingMethod({ ...shipping, postal_code: '95015' });
    expect(shownOption()).toBe('Use a different billing address');
    expect(checkoutData.billingAddress).not.toEqual(expect.objectContaining({ address_line_1: '1 Infinite Loop' }));

    await choose('Same as shipping address');
    expect(shownOption()).toBe('Same as shipping address');
    expect(checkoutData.billingAddress).toEqual({ ...shipping, postal_code: '95015' });
  });
});

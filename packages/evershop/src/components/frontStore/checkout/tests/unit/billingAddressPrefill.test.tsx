import '../../../customer/address/tests/unit/domSetup.js';
import { jest, describe, it, expect, afterEach } from '@jest/globals';
import { deriveAddressSchema } from '@evershop/evershop/lib/address/derive';
import type { AddressGraphql } from '@evershop/evershop/types/address';
import { US } from '../../../../../lib/address/tests/unit/addressFixtures.js';
import { appState } from '../../../customer/address/tests/unit/domSetup.js';

/**
 * `BillingAddress` with an address already saved on the cart — a reload of
 * the checkout, or a return to it. The form used to receive the cart's
 * address in its GraphQL shape through `setValue('billingAddress', …)`:
 * `locality` and `country` landed as objects (City "[object Object]", no
 * country selected) and `addressLine1`-style keys rode along to the server,
 * which refused them as unknown address fields. The form now fills itself
 * through `CustomerAddressForm` (`initialValuesFor`).
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

/** What `myCart.billingAddress` answers for an address saved at a first visit. */
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

/** The GraphQL keys no address field reads — what the server refused. */
const GRAPHQL_ONLY_KEYS = ['givenName', 'familyName', 'addressLine1', 'addressLine2', 'addressLine3', 'dependentLocality', 'administrativeArea', 'postalCode', 'sortingCode', 'formatted'];

function Harness({
  noShippingRequired,
  onSave
}: {
  noShippingRequired: boolean;
  onSave?: (address: unknown) => Promise<void>;
}) {
  // The checkout's own form keeps values of unmounted fields.
  const form = useForm({ shouldUnregister: false, mode: 'onBlur' });
  forms[0] = form as unknown as Form;
  return (
    <AppProvider value={appState as unknown as React.ComponentProps<typeof AppProvider>['value']}>
      <FormProvider {...form}>
        <BillingAddress
          billingAddress={saved}
          noShippingRequired={noShippingRequired}
          addBillingAddress={onSave as never}
        />
      </FormProvider>
    </AppProvider>
  );
}

describe('BillingAddress with an address saved on the cart', () => {
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
  const billingValues = () => forms[0].getValues('billingAddress') as Record<string, unknown>;

  it('no shipping: the form shows the saved address as plain field values', async () => {
    await mount(<Harness noShippingRequired />);
    const values = billingValues();
    expect(values).toEqual(
      expect.objectContaining({
        country: 'US',
        recipient: 'Ada Lovelace',
        address_line_1: '1 Congress Ave',
        locality: 'Austin',
        administrative_area: 'TX',
        postal_code: '73301'
      })
    );
    for (const key of GRAPHQL_ONLY_KEYS) expect(values).not.toHaveProperty(key);
    const city = document.getElementById('field-billingAddress.locality') as HTMLInputElement;
    expect(city.value).toBe('Austin');
  });

  it('no shipping: "Continue to payment" sends the saved address in the field vocabulary', async () => {
    const sent: unknown[] = [];
    await mount(<Harness noShippingRequired onSave={async (address) => { sent.push(address); }} />);
    const button = [...container!.querySelectorAll('button')].find((b) => b.textContent?.includes('Continue to payment'));
    await act(async () => {
      button!.click();
    });
    expect(sent).toHaveLength(1);
    const payload = sent[0] as Record<string, unknown>;
    expect(payload).toEqual(expect.objectContaining({ country: 'US', locality: 'Austin', address_line_1: '1 Congress Ave' }));
    for (const key of GRAPHQL_ONLY_KEYS) expect(payload).not.toHaveProperty(key);
    for (const value of Object.values(payload)) expect(typeof value === 'object' && value !== null).toBe(false);
  });

  it('with shipping: "Use a different billing address" starts empty, not with the saved shape', async () => {
    await mount(<Harness noShippingRequired={false} />);
    const option = [...container!.querySelectorAll('span')].find((s) => s.textContent === 'Use a different billing address');
    await act(async () => {
      option!.click();
    });
    expect(document.getElementById('field-billingAddress.locality')).not.toBeNull();
    const values = billingValues();
    for (const key of GRAPHQL_ONLY_KEYS) expect(values).not.toHaveProperty(key);
    expect(values.recipient ?? '').toBe('');
    expect(values.locality ?? '').toBe('');
    expect(values.country).toBe('US'); // the store's default country, as for any new address
  });
});

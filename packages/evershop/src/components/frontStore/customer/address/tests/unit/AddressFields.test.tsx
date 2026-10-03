import './domSetup.js';
import { jest, describe, it, expect, afterEach } from '@jest/globals';
import { deriveAddressSchema } from '@evershop/evershop/lib/address/derive';
import type { Region, ResolvedAddressSchema } from '@evershop/evershop/lib/address/types';
import { US, DE, HK, CN } from '../../../../../../lib/address/tests/unit/addressFixtures.js';
import { appState } from './domSetup.js';

/** Regions the mocked `regions(country, parentPath)` answers with. */
const REGIONS: Record<string, Region[]> = {
  'US|': [
    { key: 'CA', name: 'California', isoCode: 'US-CA' },
    { key: 'NY', name: 'New York', isoCode: 'US-NY' }
  ],
  'HK|': [
    { key: 'Hong Kong Island', name: 'Hong Kong Island' },
    { key: 'Kowloon', name: 'Kowloon' },
    { key: 'New Territories', name: 'New Territories' }
  ],
  'CN|': [
    { key: 'Beijing', name: '北京市' },
    { key: 'Shanghai', name: '上海市' }
  ],
  'CN|Beijing': [{ key: 'Chaoyang', name: '朝阳区' }],
  'CN|Shanghai': [{ key: 'Pudong', name: '浦东新区' }]
};
const regionCalls: unknown[] = [];

jest.unstable_mockModule('urql', () => ({
  useQuery: (opts: { query: string; variables: Record<string, unknown>; pause?: boolean }) => {
    if (opts.pause) {
      return [{ data: undefined, fetching: false, error: undefined }];
    }
    if (opts.query.includes('regions(')) {
      regionCalls.push(opts.variables);
      const key = `${opts.variables.country}|${((opts.variables.parentPath as string[]) ?? []).join('/')}`;
      return [{ data: { regions: REGIONS[key] ?? [] }, fetching: false, error: undefined }];
    }
    return [{ data: undefined, fetching: false, error: undefined }];
  }
}));

const React = (await import('react')).default;
const { act } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { createRoot } = await import('react-dom/client');
const { FormProvider, useForm } = await import('react-hook-form');
const { AppProvider } = await import('../../../../../common/context/app.js');
const { setAreaComponents } = await import('../../../../../common/Area.js');
const { AddressFields } = await import('../../AddressFields.js');
const { initialValuesFor, rowsOf } = await import('../../addressFormLogic.js');

const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'DE', label: 'Germany' },
  { value: 'HK', label: 'Hong Kong' },
  { value: 'CN', label: 'China' }
];
const us = deriveAddressSchema({ country: 'US', record: US, locale: 'en', regionLevels: ['administrative_area'] });
const de = deriveAddressSchema({ country: 'DE', record: DE, locale: 'en', regionLevels: [] });
const hk = deriveAddressSchema({ country: 'HK', record: HK, locale: 'en', regionLevels: ['administrative_area'] });
const cn = deriveAddressSchema({ country: 'CN', record: CN, locale: 'zh', regionLevels: ['administrative_area', 'locality'] });

type Form = ReturnType<typeof useForm>;
const forms: Form[] = [];

function Harness({
  schema,
  shouldUnregister = false,
  initialValues
}: {
  schema: ResolvedAddressSchema;
  shouldUnregister?: boolean;
  initialValues?: Record<string, string>;
}) {
  const form = useForm({ shouldUnregister, mode: 'onBlur' });
  forms[0] = form;
  return (
    <AppProvider value={appState as unknown as React.ComponentProps<typeof AppProvider>['value']}>
      <FormProvider {...form}>
        <AddressFields schema={schema} namePrefix="shippingAddress" surface="shipping" countries={COUNTRIES} initialValues={initialValues} />
      </FormProvider>
    </AppProvider>
  );
}

function HarnessWithCountries({ schema, countries }: { schema: ResolvedAddressSchema; countries: { value: string; label: string }[] }) {
  const form = useForm({ mode: 'onBlur' });
  forms[0] = form;
  return (
    <AppProvider value={appState as unknown as React.ComponentProps<typeof AppProvider>['value']}>
      <FormProvider {...form}>
        <AddressFields schema={schema} namePrefix="shippingAddress" surface="shipping" countries={countries} />
      </FormProvider>
    </AppProvider>
  );
}

const ssr = (el: React.ReactElement) => renderToStaticMarkup(el);
/** Field ids in DOM order, read from the labels' `for` attributes. */
const fieldOrder = (html: string) =>
  [...html.matchAll(/for="field-shippingAddress\.([a-z_0-9]+)"/g)].map((m) => m[1]);
/** The attribute text of the element carrying `id`. */
const attrsOf = (html: string, id: string) => {
  const at = html.indexOf(`id="${id}"`);
  if (at < 0) return '';
  const start = html.lastIndexOf('<', at);
  const end = html.indexOf('>', at);
  return html.slice(start, end);
};

describe('AddressFields (SSR)', () => {
  it('renders the United States schema in row order with the country first and typed labels', () => {
    const html = ssr(<Harness schema={us} />);
    expect(fieldOrder(html)).toEqual(rowsOf(us).flat().map((f) => f.id));
    expect(fieldOrder(html)[0]).toBe('country');
    for (const label of ['Full name', 'Telephone', 'Company', 'Address', 'City', 'State', 'ZIP code', 'Country']) {
      expect(html).toContain(label);
    }
    const rows = new Set([...html.matchAll(/data-row="(\d+)"/g)].map((m) => m[1]));
    expect(rows.size).toBe(rowsOf(us).length);
    // "%C, %S %Z" share a row: three fields with the same data-row.
    const zipRow = html.match(/data-row="(\d+)" data-field="postal_code"/)![1];
    expect(html).toContain(`data-row="${zipRow}" data-field="locality"`);
    expect(html).toContain(`data-row="${zipRow}" data-field="administrative_area"`);
    expect(html).toContain('Select State'); // the region select's placeholder
  });

  it('Hong Kong gets an area select and a district, and no postal code', () => {
    const html = ssr(<Harness schema={hk} />);
    expect(html).toContain('Area');
    expect(html).toContain('District');
    expect(html).toContain('Select Area');
    expect(html).not.toContain('field-shippingAddress.postal_code');
    // Latin layout for an English reader: name first, area last.
    const order = fieldOrder(html);
    expect(order.indexOf('recipient')).toBeLessThan(order.indexOf('administrative_area'));
  });

  it('marks a stored key the provider no longer lists', () => {
    const html = ssr(<Harness schema={hk} initialValues={{ administrative_area: 'Victoria' }} />);
    expect(html).toContain('Victoria — no longer available');
  });

  it('pre-fills split names from a legacy recipient-only row', () => {
    const split: ResolvedAddressSchema = {
      ...us,
      fields: us.fields.flatMap((f) =>
        f.id === 'recipient'
          ? [
              { ...f, id: 'given_name', labelType: 'given_name' },
              { ...f, id: 'family_name', labelType: 'family_name' }
            ]
          : [f]
      )
    };
    const values = initialValuesFor({ recipient: 'Ada Lovelace', country: { code: 'US', name: 'United States' } }, split);
    const html = ssr(<Harness schema={split} initialValues={values} />);
    expect(html).toContain('Given name');
    expect(html).toContain('Family name');
    expect(html).toContain('value="Ada"');
    expect(html).toContain('value="Lovelace"');
  });

  it('disables a dependent level until its parent has a value', () => {
    const html = ssr(<Harness schema={cn} />);
    expect(cn.fields.find((f) => f.id === 'locality')?.dependsOn).toBe('administrative_area');
    // The attribute, not Tailwind's `disabled:` variants in the class list.
    const DISABLED = /\sdisabled(=""|\s|$)|\sdata-disabled|aria-disabled="true"/;
    expect(attrsOf(html, 'field-shippingAddress.locality')).toMatch(DISABLED);
    expect(attrsOf(html, 'field-shippingAddress.administrative_area')).not.toMatch(DISABLED);
  });

  it('renders the country as a read-only line when only one country is offered', () => {
    const one = ssr(<HarnessWithCountries schema={us} countries={[{ value: 'US', label: 'United States' }]} />);
    const attrs = attrsOf(one, 'field-shippingAddress.country');
    expect(attrs).toContain('data-readonly="true"');
    expect(attrs).not.toContain('role="combobox"');
    expect(one).toContain('United States');
    expect(one).not.toContain('Select Country');
    // Two countries: a real select again.
    const two = ssr(<HarnessWithCountries schema={us} countries={[{ value: 'US', label: 'United States' }, { value: 'CA', label: 'Canada' }]} />);
    expect(attrsOf(two, 'field-shippingAddress.country')).toContain('role="combobox"');
  });

  it('lets an extension decorate one field through its Area (sortOrder 5 above, 15 below)', () => {
    setAreaComponents('checkout', {
      'addressField.locality': {
        before: { id: 'before', sortOrder: 5, component: { default: () => <div>BEFORE-LOCALITY</div> } },
        after: { id: 'after', sortOrder: 15, component: { default: () => <div>AFTER-LOCALITY</div> } }
      }
    } as unknown as Parameters<typeof setAreaComponents>[1]);
    try {
      const html = ssr(<Harness schema={us} />);
      const before = html.indexOf('BEFORE-LOCALITY');
      const field = html.indexOf('field-shippingAddress.locality');
      const after = html.indexOf('AFTER-LOCALITY');
      expect(before).toBeGreaterThan(-1);
      expect(before).toBeLessThan(field);
      expect(field).toBeLessThan(after);
      // Only that field is decorated.
      expect((html.match(/BEFORE-LOCALITY/g) ?? []).length).toBe(1);
    } finally {
      setAreaComponents('checkout', {});
    }
  });
});

describe('AddressFields (interactive)', () => {
  let container: HTMLElement | undefined;
  let root: ReturnType<typeof createRoot> | undefined;
  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    regionCalls.length = 0;
  });

  const mount = async (el: React.ReactElement) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(el);
    });
  };
  const rerender = async (el: React.ReactElement) => {
    await act(async () => {
      root!.render(el);
    });
  };
  const set = async (values: Record<string, string>) => {
    await act(async () => {
      for (const [id, value] of Object.entries(values)) {
        forms[0].setValue(`shippingAddress.${id}`, value, { shouldDirty: true });
      }
    });
  };

  it.each([
    ['checkout: external useForm, shouldUnregister false', false],
    ['<Form>: shouldUnregister true', true]
  ])('country swap US → DE clears exactly the changed fields (%s)', async (_label, shouldUnregister) => {
    await mount(<Harness schema={us} shouldUnregister={shouldUnregister} />);
    await set({
      country: 'US',
      recipient: 'Ada Lovelace',
      telephone: '+14085551234',
      organization: 'Analytical Engines',
      address_line_1: '1 Infinite Loop',
      locality: 'Cupertino',
      administrative_area: 'CA',
      postal_code: '95014'
    });
    expect(forms[0].getValues('shippingAddress.administrative_area')).toBe('CA');

    await set({ country: 'DE' });
    await rerender(<Harness schema={de} shouldUnregister={shouldUnregister} />);

    const values = forms[0].getValues('shippingAddress') as Record<string, unknown>;
    expect(values.recipient).toBe('Ada Lovelace'); // same shape in both: kept
    expect(values.telephone).toBe('+14085551234');
    expect(values.organization).toBe('Analytical Engines');
    expect(values.address_line_1).toBe('1 Infinite Loop');
    expect(values.locality).toBe('Cupertino');
    expect(values.postal_code).toBe(''); // pattern differs: cleared
    expect(values.administrative_area).toBeUndefined(); // absent in DE: removed
    expect(values.country).toBe('DE');
  });

  it('a field kept across a swap takes the new country\'s rules (US required City → HK optional District)', async () => {
    await mount(<Harness schema={us} />);
    await set({ country: 'US' });
    // US: locality is required
    await act(async () => { expect(await forms[0].trigger('shippingAddress.locality')).toBe(false); });
    await set({ country: 'HK' });
    await rerender(<Harness schema={hk} />);
    expect(hk.fields.find((f) => f.id === 'locality')?.required).toBe(false);
    // HK: the same registered field, kept through the swap, must now validate empty.
    let valid = false;
    await act(async () => { valid = await forms[0].trigger('shippingAddress.locality'); });
    expect(valid).toBe(true);
    expect(forms[0].getFieldState('shippingAddress.locality').error).toBeUndefined();
  });

  it('registers the fixed country value so the form posts it', async () => {
    await mount(<HarnessWithCountries schema={us} countries={[{ value: 'US', label: 'United States' }]} />);
    expect(forms[0].getValues('shippingAddress.country')).toBe('US');
  });

  it('a region select clears on a swap between two countries that both enumerate the level', async () => {
    await mount(<Harness schema={us} />);
    await set({ country: 'US', administrative_area: 'CA', locality: 'Cupertino' });
    await set({ country: 'HK' });
    await rerender(<Harness schema={hk} />);
    expect(forms[0].getValues('shippingAddress.administrative_area') ?? '').toBe('');
    expect(forms[0].getValues('shippingAddress.locality')).toBe('Cupertino'); // text in both
  });

  it('the dependsOn cascade clears the inner level when the outer level changes, and fetches by parent path', async () => {
    await mount(<Harness schema={cn} />);
    await set({ country: 'CN', administrative_area: 'Beijing' });
    expect(regionCalls).toContainEqual({ country: 'CN', parentPath: ['Beijing'] });
    await set({ locality: 'Chaoyang' });
    expect(forms[0].getValues('shippingAddress.locality')).toBe('Chaoyang');

    await set({ administrative_area: 'Shanghai' });
    // Cleared by the cascade; the select may report the empty value as undefined.
    expect(forms[0].getValues('shippingAddress.locality') ?? '').toBe('');
    expect(regionCalls).toContainEqual({ country: 'CN', parentPath: ['Shanghai'] });
  });
});

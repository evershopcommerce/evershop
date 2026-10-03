import './domSetup.js';
import { jest, describe, it, expect, afterEach } from '@jest/globals';
import { deriveAddressSchema } from '@evershop/evershop/lib/address/derive';
import type { ResolvedAddressField } from '@evershop/evershop/lib/address/types';
import { US } from '../../../../../../lib/address/tests/unit/addressFixtures.js';
import { appState } from './domSetup.js';

jest.unstable_mockModule('urql', () => ({
  useQuery: () => [{ data: undefined, fetching: false, error: undefined }]
}));

const React = (await import('react')).default;
const { act } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { createRoot } = await import('react-dom/client');
const { FormProvider, useForm } = await import('react-hook-form');
const { AppProvider } = await import('../../../../../common/context/app.js');
const { addressFieldRenderers, getAddressFieldRenderer, FallbackRenderer } = await import('../../addressFieldRenderers.js');
const { MasterField } = await import('../../MasterField.js');
const { rulesFor } = await import('../../AddressFields.js');
const { fieldName } = await import('../../addressFormLogic.js');
const { addressFieldLabel } = await import('../../labelTypes.js');
type AddressRendererProps = import('../../AddressFields.js').AddressRendererProps;

const us = deriveAddressSchema({ country: 'US', record: US, locale: 'en', regionLevels: ['administrative_area'] });

function Harness({ children }: { children: React.ReactNode }) {
  const form = useForm();
  return (
    <AppProvider value={appState as unknown as React.ComponentProps<typeof AppProvider>['value']}>
      <FormProvider {...form}>{children}</FormProvider>
    </AppProvider>
  );
}

const ssr = (el: React.ReactElement) => renderToStaticMarkup(<Harness>{el}</Harness>);

/** `type` is widened on purpose: the fallback path exists for types the union does not know. */
const field = (over: Partial<Omit<ResolvedAddressField, 'type'>> & { type?: string }): ResolvedAddressField =>
  ({
    id: 'locality',
    type: 'text',
    labelType: 'city',
    required: true,
    row: 1,
    ...over
  }) as ResolvedAddressField;

describe('the renderer map', () => {
  it('covers the six field types and falls back to a warned text input for an unknown one', () => {
    expect(Object.keys(addressFieldRenderers).sort()).toEqual(['email', 'number', 'select', 'tel', 'text', 'textarea']);
    expect(getAddressFieldRenderer('bogus')).toBe(FallbackRenderer);
  });

  it.each(['text', 'select', 'tel', 'textarea', 'number', 'email'])('renders a %s field with its label, required marker and prefixed name', (type) => {
    const f = field({ type, id: `f_${type}` });
    const label = `Label ${type}`;
    const html = ssr(
      <MasterField
        field={f}
        name={fieldName('shippingAddress', f.id)}
        label={label}
        required
        rules={rulesFor(f, label)}
        options={[{ value: 'a', label: 'A' }]}
        placeholder="Pick"
      />
    );
    expect(html).toContain(label);
    expect(html).toContain('text-destructive'); // the required asterisk
    expect(html).toContain(`field-shippingAddress.f_${type}`);
  });

  it('an unknown type renders a text input and warns once per type', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const f = field({ type: 'hologram', id: 'holo' });
      const first = ssr(<MasterField field={f} name="holo" label="Holo" required={false} rules={{}} />);
      ssr(<MasterField field={f} name="holo" label="Holo" required={false} rules={{}} />);
      expect(first).toContain('field-holo');
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain('hologram');
    } finally {
      warn.mockRestore();
    }
  });
});

describe('rulesFor', () => {
  const tel = field({ id: 'telephone', type: 'tel', labelType: 'telephone', pattern: { regex: '^(\\+84|0)[0-9]{9}$', messageKey: '${field} is not valid' } });
  const zip = field({ id: 'postal_code', type: 'text', labelType: 'zip', pattern: { regex: '^\\d{5}$', messageKey: '${field} is not valid' } });

  it('tests a telephone pattern on the normalized number, as the server does', () => {
    const rules = rulesFor(tel, 'Telephone');
    const validate = rules.validate as (v: unknown) => true | string;
    expect(validate('0912 345 678')).toBe(true);
    expect(validate('+84 912-345-678')).toBe(true);
    expect(validate('12345')).toBe('Telephone is not valid');
    expect(validate('')).toBe(true); // emptiness is `required`'s business
    expect(rules.pattern).toBeUndefined();
  });

  it('keeps a plain pattern rule for other fields', () => {
    const rules = rulesFor(zip, 'ZIP code');
    expect(rules.pattern).toEqual({ value: /^\d{5}$/, message: 'ZIP code is not valid' });
    expect(rules.required).toBe('ZIP code is required');
    expect(rules.validate).toBeUndefined();
  });

  it('always emits every rule key so a re-register after a country swap overrides the old rule', () => {
    const optional = rulesFor(field({ id: 'locality', required: false }), 'City');
    expect(Object.keys(optional).sort()).toEqual(['pattern', 'required', 'validate']);
    expect(optional.required).toBe(false);
    expect(optional.pattern).toBeUndefined();
  });
});

/**
 * A third party builds its own layout against `AddressRendererProps` with
 * nothing but the schema and `rulesFor`: plain inputs, one per field, and the
 * form validates and submits the same nested payload the default renderer
 * would. This is the contract a theme relies on when it replaces
 * `AddressFields.tsx` through the alias chain.
 */
function MinimalRenderer({ schema, namePrefix }: AddressRendererProps) {
  const { register } = (globalThis as unknown as { __rhf: ReturnType<typeof useForm> }).__rhf;
  return (
    <div>
      {schema.fields.map((f) => (
        <input
          key={f.id}
          data-field={f.id}
          {...register(fieldName(namePrefix, f.id), rulesFor(f, addressFieldLabel(f)))}
        />
      ))}
    </div>
  );
}

describe('a minimal third-party renderer over AddressRendererProps', () => {
  let container: HTMLElement | undefined;
  let root: ReturnType<typeof createRoot> | undefined;
  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  it('submits a complete address and rejects a bad ZIP through the schema rules', async () => {
    let form!: ReturnType<typeof useForm>;
    function Page() {
      form = useForm({ mode: 'onSubmit' });
      (globalThis as unknown as { __rhf: typeof form }).__rhf = form;
      return (
        <FormProvider {...form}>
          <MinimalRenderer schema={us} namePrefix="shippingAddress" surface="shipping" countries={[{ value: 'US', label: 'United States' }]} />
        </FormProvider>
      );
    }
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(<Page />);
    });
    expect(container.querySelectorAll('input[data-field]')).toHaveLength(us.fields.length);

    const fill = (values: Record<string, string>) => {
      for (const [id, value] of Object.entries(values)) {
        form.setValue(`shippingAddress.${id}`, value);
      }
    };
    const onValid = jest.fn();
    const onInvalid = jest.fn();
    await act(async () => {
      fill({ country: 'US', recipient: 'Ada Lovelace', telephone: '+14085551234', address_line_1: '1 Infinite Loop', locality: 'Cupertino', administrative_area: 'CA', postal_code: '9501' });
      await form.handleSubmit(onValid, onInvalid)();
    });
    expect(onValid).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledTimes(1);
    const errors = onInvalid.mock.calls[0][0] as { shippingAddress?: Record<string, { message?: string }> };
    expect(errors.shippingAddress?.postal_code?.message).toBe('ZIP code is not valid');

    await act(async () => {
      fill({ postal_code: '95014' });
      await form.handleSubmit(onValid, onInvalid)();
    });
    expect(onValid).toHaveBeenCalledTimes(1);
    // Every schema field is in the payload (optional ones empty), nothing else.
    const expected: Record<string, string> = Object.fromEntries(us.fields.map((f) => [f.id, '']));
    Object.assign(expected, {
      country: 'US',
      recipient: 'Ada Lovelace',
      telephone: '+14085551234',
      address_line_1: '1 Infinite Loop',
      locality: 'Cupertino',
      administrative_area: 'CA',
      postal_code: '95014'
    });
    expect(onValid.mock.calls[0][0]).toEqual({ shippingAddress: expected });
  });
});

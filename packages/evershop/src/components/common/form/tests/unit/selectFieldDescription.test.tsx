import '../../../../frontStore/customer/address/tests/unit/domSetup.js';
import { describe, it, expect, afterEach } from '@jest/globals';

/**
 * SelectField's `description`: shown under the select and linked to it with
 * aria-describedby, so a screen reader reads it with the select (the GA4
 * "Cookie consent" note in the store settings). An error is linked too.
 */
const React = (await import('react')).default;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { FormProvider, useForm } = await import('react-hook-form');
const { SelectField } = await import('../../SelectField.js');

type Form = import('react-hook-form').UseFormReturn;
let form: Form | undefined;

function Harness({ children }: { children: React.ReactNode }) {
  const methods = useForm();
  form = methods as unknown as Form;
  return <FormProvider {...methods}>{children}</FormProvider>;
}

const options = [
  { value: 'granted', label: 'Not required' },
  { value: 'denied', label: 'Required' }
];

describe('SelectField description', () => {
  let container: HTMLElement | undefined;
  let root: ReturnType<typeof createRoot> | undefined;
  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });
  const mount = async (el: React.ReactElement) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(<Harness>{el}</Harness>);
    });
    return container;
  };

  it('is shown under the select and read with it', async () => {
    const page = await mount(
      <SelectField name="consent" label="Cookie consent" options={options} defaultValue="granted" description="Choose Required with a banner." />
    );
    const trigger = page.querySelector('#field-consent')!;
    const description = page.querySelector('#field-consent-description')!;
    expect(description.textContent).toBe('Choose Required with a banner.');
    expect(trigger.getAttribute('aria-describedby')).toBe('field-consent-description');
  });

  it('with an error, both are linked; without a description, only the error', async () => {
    const page = await mount(
      <>
        <SelectField name="consent" label="Cookie consent" options={options} description="A note." />
        <SelectField name="other" label="Other" options={options} />
      </>
    );
    await act(async () => {
      form!.setError('consent', { message: 'Pick one' });
      form!.setError('other', { message: 'Pick one' });
    });
    expect(page.querySelector('#field-consent')!.getAttribute('aria-describedby')).toBe(
      'field-consent-description field-consent-error'
    );
    expect(page.querySelector('#field-other')!.getAttribute('aria-describedby')).toBe('field-other-error');
    expect(page.querySelector('#field-other-description')).toBeNull();
  });

  it('no description and no error: no aria-describedby', async () => {
    const page = await mount(<SelectField name="consent" label="Cookie consent" options={options} />);
    expect(page.querySelector('#field-consent')!.hasAttribute('aria-describedby')).toBe(false);
  });
});

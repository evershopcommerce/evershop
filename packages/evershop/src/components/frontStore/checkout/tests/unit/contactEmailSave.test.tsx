import '../../../customer/address/tests/unit/domSetup.js';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

/**
 * Spec C2: the checkout saves a guest's email to the cart as soon as it is
 * entered (`ContactInformation` → `CartContext.addContactInfo`), not only
 * with the order. It saves on the DOM `change` event (leaving the field after
 * changing it, or autofill), never on each key, and only a valid email the
 * cart does not have yet. A failed save is silent and tried again on the next
 * change. A logged-in customer has no field: the server puts their email on
 * the cart.
 */
type Form = import('react-hook-form').UseFormReturn;
const forms: Form[] = [];
jest.unstable_mockModule('@components/frontStore/checkout/CheckoutContext.js', () => ({
  useCheckout: () => ({ form: forms[0] }),
  useCheckoutDispatch: () => ({ updateCheckoutData: () => undefined })
}));

let cartEmail = '';
const saved: string[] = [];
let failSave = false;
const addContactInfo = async ({ email }: { email: string }) => {
  saved.push(email);
  if (failSave) {
    throw new Error('Network down');
  }
};
jest.unstable_mockModule('@components/frontStore/cart/CartContext.js', () => ({
  useCartState: () => ({ data: { uuid: 'cart-1', customerEmail: cartEmail } }),
  useCartDispatch: () => ({ addContactInfo })
}));

let customer: Record<string, string> | null = null;
jest.unstable_mockModule('@components/frontStore/customer/CustomerContext.jsx', () => ({
  useCustomer: () => ({ customer }),
  useCustomerDispatch: () => ({ login: async () => undefined, logout: async () => undefined })
}));
jest.unstable_mockModule('@components/common/Area.js', () => ({
  default: () => null
}));

const React = (await import('react')).default;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { FormProvider, useForm } = await import('react-hook-form');
const { ContactInformation } = await import('../../ContactInformation.js');

function Harness() {
  const form = useForm();
  forms[0] = form;
  return (
    <FormProvider {...form}>
      <ContactInformation />
    </FormProvider>
  );
}

const valueSetter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype,
  'value'
)!.set!;

describe('the guest email at checkout', () => {
  let container: HTMLElement;
  let root: ReturnType<typeof createRoot>;

  const emailInput = () =>
    container.querySelector('input[name="contact.email"]') as HTMLInputElement;

  /** Key presses: one `input` event per character, as a browser sends them */
  const type = async (text: string) => {
    const input = emailInput();
    for (let i = 1; i <= text.length; i += 1) {
      await act(async () => {
        valueSetter.call(input, text.slice(0, i));
        input.dispatchEvent(new window.Event('input', { bubbles: true }));
      });
    }
  };
  /** The browser commits the value: the shopper leaves the field, or autofill */
  const commit = async () => {
    await act(async () => {
      emailInput().dispatchEvent(new window.Event('change', { bubbles: true }));
    });
  };
  const fill = async (text: string) => {
    await act(async () => {
      valueSetter.call(emailInput(), text);
      emailInput().dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    await commit();
  };

  async function mount() {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(<Harness />);
    });
  }

  beforeEach(() => {
    cartEmail = '';
    saved.length = 0;
    failSave = false;
    customer = null;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('saves when the shopper leaves the field, not while typing', async () => {
    await mount();
    await type('jane@example.com');
    expect(saved).toEqual([]);
    await commit();
    expect(saved).toEqual(['jane@example.com']);
  });

  // The email input (type="email") drops the spaces around the value itself
  it('saves an email filled by autofill (a change event, no typing), without spaces', async () => {
    await mount();
    await fill('  jane@example.com ');
    expect(saved).toEqual(['jane@example.com']);
  });

  it('never saves an invalid email', async () => {
    await mount();
    for (const value of ['jane', 'jane@', 'jane@example', '@example.com', 'jane doe@example.com', '']) {
      await fill(value);
    }
    expect(saved).toEqual([]);
  });

  it('saves each new email once, and not the one the cart has', async () => {
    cartEmail = 'jane@example.com';
    await mount();
    await fill('jane@example.com');
    expect(saved).toEqual([]);
    await fill('john@example.com');
    await fill('john@example.com');
    await fill('jane@example.com');
    expect(saved).toEqual(['john@example.com', 'jane@example.com']);
  });

  it('a failed save is silent and tried again on the next change', async () => {
    const consoleError = jest.spyOn(console, 'error');
    try {
      await mount();
      failSave = true;
      await fill('jane@example.com');
      failSave = false;
      await fill('jane@example.com');
      expect(saved).toEqual(['jane@example.com', 'jane@example.com']);
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('a logged-in customer: no email field, nothing saved', async () => {
    customer = { uuid: 'c-1', fullName: 'Jane Doe', email: 'jane@example.com' };
    await mount();
    expect(emailInput()).toBeNull();
    expect(container.textContent).toContain('jane@example.com');
    expect(saved).toEqual([]);
  });
});

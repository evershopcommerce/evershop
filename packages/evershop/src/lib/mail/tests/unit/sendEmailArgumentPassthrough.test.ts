import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * `sendEmail` hands the registered service a single args object, and the
 * service decides what to do with each field. A service that only maps
 * `from` / `to` / `subject` / `body` silently drops everything else — which is
 * how a contact-form notification ended up with the store's no-reply address in
 * `Reply-To` instead of the person who wrote in.
 *
 * Core's half of that contract is what these tests pin: every field a caller
 * sets must survive the pipeline (`emailArguments` processor, validation,
 * body rendering) and arrive intact at `service.sendEmail`. Whether a given
 * service then maps it onto its provider's API is the service's responsibility,
 * but it cannot map what it never receives.
 */

const getValue = jest.fn(async (_name: string, value: any) => value);
const getValueSync = jest.fn((_name: string, def: any) => def);
const addProcessor = jest.fn();
const getConfig = jest.fn((_key: string, def: any) => def);
const getStoreLanguage = jest.fn(async () => 'en');
const getStoreLanguageSync = jest.fn(() => 'en');

jest.unstable_mockModule('../../../util/registry.js', () => ({
  getValue,
  getValueSync,
  addProcessor
}));
jest.unstable_mockModule('../../../util/getConfig.js', () => ({ getConfig }));
jest.unstable_mockModule(
  '../../../../modules/setting/services/setting.js',
  () => ({
    getSetting: async (_key: string, def: any) => def,
    getStoreLanguage,
    getStoreLanguageSync,
    getStoreCurrency: async () => 'USD',
    getStoreTimezone: () => 'UTC'
  })
);

const { sendEmail, registerEmailService, validateSendEmailArguments } =
  await import('../../emailHelper.js');

let received: any = null;
const service = {
  sendEmail: jest.fn(async (args: any) => {
    received = args;
  })
};

const BASE = {
  to: 'shop@example.com',
  from: 'no-reply@example.com',
  subject: 'New contact form message from Jane',
  template: '<p>hi</p>',
  // `body` present so the helper skips template rendering — this suite is about
  // argument passthrough, not Handlebars.
  body: '<p>hi</p>',
  data: {}
};

describe('sendEmail argument passthrough', () => {
  beforeEach(() => {
    received = null;
    jest.clearAllMocks();
    // The registry is mocked, so wire the service in by hand the way
    // registerEmailService would.
    getValueSync.mockImplementation(() => service);
  });

  it('forwards replyTo to the registered service', async () => {
    await sendEmail('contact_form', {
      ...BASE,
      replyTo: 'jane@example.com'
    } as any);

    expect(service.sendEmail).toHaveBeenCalledTimes(1);
    expect(received.replyTo).toBe('jane@example.com');
  });

  it('keeps replyTo distinct from from — they are not interchangeable', async () => {
    await sendEmail('contact_form', {
      ...BASE,
      replyTo: 'jane@example.com'
    } as any);

    expect(received.from).toBe('no-reply@example.com');
    expect(received.replyTo).toBe('jane@example.com');
    expect(received.replyTo).not.toBe(received.from);
  });

  it('omits replyTo when the caller did not set one', async () => {
    await sendEmail('order_confirmation', { ...BASE } as any);

    expect(received.replyTo).toBeUndefined();
  });

  it('forwards cc, which core validates as an array of strings', async () => {
    await sendEmail('contact_form', {
      ...BASE,
      cc: ['ops@example.com']
    } as any);

    expect(received.cc).toEqual(['ops@example.com']);
  });

  it('rejects a cc that is not an array rather than passing it on', async () => {
    await expect(
      sendEmail('contact_form', { ...BASE, cc: 'ops@example.com' } as any)
    ).rejects.toThrow(/"cc" field must be an array/);
  });

  it('forwards fields core does not declare, so a service can opt into them', async () => {
    await sendEmail('contact_form', {
      ...BASE,
      'h:X-Custom': 'yes'
    } as any);

    expect(received['h:X-Custom']).toBe('yes');
  });

  it('rejects when no service is registered rather than dropping the mail', async () => {
    getValueSync.mockImplementation(() => undefined);

    await expect(sendEmail('contact_form', { ...BASE } as any)).rejects.toThrow(
      /No email service registered/
    );
  });
});

describe('validateSendEmailArguments', () => {
  it('accepts a replyTo-carrying payload', () => {
    expect(() =>
      validateSendEmailArguments({ ...BASE, replyTo: 'jane@example.com' })
    ).not.toThrow();
  });

  it('still requires to and subject', () => {
    expect(() => validateSendEmailArguments({ ...BASE, to: '' })).toThrow();
    expect(() =>
      validateSendEmailArguments({ ...BASE, subject: '' })
    ).toThrow();
  });
});

// Referenced so the import is not flagged unused when the suite is read in
// isolation; registerEmailService is the documented way to install a service.
expect(typeof registerEmailService).toBe('function');

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

let emailService: any = { sendEmail: jest.fn() };
const getEmailService = jest.fn(() => emailService);
const sendEmail = jest.fn(async () => undefined);

let storeEmail: string | null = 'shop@example.com';
const getStoreEmail = jest.fn(async () => storeEmail);
const getStoreLanguage = jest.fn(async () => 'en');

let configValue: any = { enabled: true };
const getConfig = jest.fn(() => configValue);

// The registry processors are pass-throughs in core; the real getValue applies
// whatever extensions registered.
const getValue = jest.fn(async (_name: string, value: any) => value);
const translate = jest.fn((text: string) => text);
const debug = jest.fn();

jest.unstable_mockModule('../../../../../../lib/mail/emailHelper.js', () => ({
  getEmailService,
  sendEmail
}));
jest.unstable_mockModule('../../../../../setting/services/setting.js', () => ({
  getStoreEmail,
  getStoreLanguage
}));
jest.unstable_mockModule('../../../../../../lib/util/getConfig.js', () => ({
  getConfig
}));
jest.unstable_mockModule('../../../../../../lib/util/registry.js', () => ({
  getValue
}));
jest.unstable_mockModule(
  '../../../../../../lib/locale/translate/translate.js',
  () => ({ translate })
);
jest.unstable_mockModule('../../../../../../lib/log/logger.js', () => ({
  debug
}));

const { sendContactFormEmail } = await import('../../sendContactFormEmail.js');

const submission = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: null,
  subject: 'Shipping',
  message: 'Do you ship to Vietnam?'
};

describe('sendContactFormEmail', () => {
  beforeEach(() => {
    emailService = { sendEmail: jest.fn() };
    storeEmail = 'shop@example.com';
    configValue = { enabled: true };
    jest.clearAllMocks();
  });

  it('sends to the store email with the visitor on replyTo', async () => {
    const result = await sendContactFormEmail(submission);

    expect(result).toEqual({ sent: true });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const [id, args] = sendEmail.mock.calls[0] as any[];
    expect(id).toBe('contact_form');
    expect(args.to).toBe('shop@example.com');
    expect(args.replyTo).toBe('jane@example.com');
  });

  // Core ships no SMTP — an unconfigured store must not throw, just not send.
  it('reports rather than throws when no email service is registered', async () => {
    emailService = undefined;

    const result = await sendContactFormEmail(submission);

    expect(result).toEqual({
      sent: false,
      reason: 'No email service registered'
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('reports rather than throws when the store email is not set', async () => {
    storeEmail = null;

    const result = await sendContactFormEmail(submission);

    expect(result).toEqual({ sent: false, reason: 'Store email is not set' });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('respects the config kill switch', async () => {
    configValue = { enabled: false };

    const result = await sendContactFormEmail(submission);

    expect(result.sent).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('checks the service before reading the store email', async () => {
    // Ordering matters only for the reported reason: "no service" is the more
    // actionable message, so it must win when both are missing.
    emailService = undefined;
    storeEmail = null;

    const result = await sendContactFormEmail(submission);

    expect(result.reason).toBe('No email service registered');
  });

  it('renders the visitor address into the body data as a replyTo fallback', async () => {
    await sendContactFormEmail(submission);

    const [, args] = sendEmail.mock.calls[0] as any[];
    expect(args.data.submission.email).toBe('jane@example.com');
    expect(args.template).toContain('submission.email');
  });
});

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

let insertedRow: any = null;
const insChain: any = {
  given: jest.fn((d: any) => {
    insertedRow = d;
    return insChain;
  }),
  execute: jest.fn(async () => ({ uuid: 'sub-uuid-1', ...insertedRow }))
};
const insert = jest.fn(() => insChain);

let updateGiven: any = null;
let updateShouldThrow = false;
const updChain: any = {
  given: jest.fn((d: any) => {
    updateGiven = d;
    return updChain;
  }),
  where: jest.fn(() => updChain),
  execute: jest.fn(async () => {
    if (updateShouldThrow) {
      throw new Error('db exploded while recording the send outcome');
    }
    return { uuid: 'sub-uuid-1' };
  })
};
const update = jest.fn(() => updChain);

let sendResult: any = { sent: true };
let sendShouldThrow: Error | null = null;
const sendContactFormEmail = jest.fn(async () => {
  if (sendShouldThrow) {
    throw sendShouldThrow;
  }
  return sendResult;
});

jest.unstable_mockModule('@evershop/postgres-query-builder', () => ({
  insert,
  update
}));
jest.unstable_mockModule(
  '../../../../../../lib/postgres/connection.js',
  () => ({
    pool: {}
  })
);
jest.unstable_mockModule('../../sendContactFormEmail.js', () => ({
  sendContactFormEmail
}));

const { submitContactForm } = await import('../../submitContactForm.js');

const valid = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  message: 'Do you ship to Vietnam?'
};

describe('submitContactForm', () => {
  beforeEach(() => {
    insertedRow = null;
    updateGiven = null;
    updateShouldThrow = false;
    sendResult = { sent: true };
    sendShouldThrow = null;
    jest.clearAllMocks();
  });

  it('stores a valid submission as unread and emails it', async () => {
    const result = await submitContactForm(valid);

    expect(result).toEqual({
      uuid: 'sub-uuid-1',
      status: 'unread',
      emailSent: true
    });
    expect(insertedRow.name).toBe('Jane Doe');
    expect(insertedRow.status).toBe('unread');
    expect(sendContactFormEmail).toHaveBeenCalledTimes(1);
    expect(updateGiven).toEqual({ email_sent: true, email_error: null });
  });

  // The whole point of persisting: a mail failure must never cost the message.
  it('still commits the row when the email throws', async () => {
    sendShouldThrow = new Error('SMTP connection refused');

    const result = await submitContactForm(valid);

    expect(insert).toHaveBeenCalledWith('contact_submission');
    expect(insertedRow.message).toBe('Do you ship to Vietnam?');
    expect(result.uuid).toBe('sub-uuid-1');
    expect(result.emailSent).toBe(false);
    expect(updateGiven).toEqual({
      email_sent: false,
      email_error: 'SMTP connection refused'
    });
  });

  it('records why nothing was sent when there is no email service', async () => {
    sendResult = { sent: false, reason: 'No email service registered' };

    const result = await submitContactForm(valid);

    expect(result.emailSent).toBe(false);
    expect(updateGiven).toEqual({
      email_sent: false,
      email_error: 'No email service registered'
    });
  });

  it('does not fail the submission when recording the outcome fails', async () => {
    updateShouldThrow = true;

    await expect(submitContactForm(valid)).resolves.toMatchObject({
      uuid: 'sub-uuid-1',
      status: 'unread'
    });
  });

  it('marks a honeypot hit as spam and never emails it', async () => {
    const result = await submitContactForm({
      ...valid,
      website: 'http://spam.example'
    });

    expect(result.status).toBe('spam');
    expect(insertedRow.status).toBe('spam');
    expect(sendContactFormEmail).not.toHaveBeenCalled();
    // Same response shape as a real submission — a bot learns nothing.
    expect(result.uuid).toBe('sub-uuid-1');
  });

  it('marks a link-stuffed message as spam', async () => {
    const result = await submitContactForm({
      ...valid,
      message:
        'https://a.example https://b.example https://c.example https://d.example'
    });

    expect(result.status).toBe('spam');
    expect(sendContactFormEmail).not.toHaveBeenCalled();
  });

  it('strips tags from every free-text field', async () => {
    await submitContactForm({
      name: '<script>alert(1)</script>Jane',
      email: 'jane@example.com',
      phone: '<b>+84 123</b>',
      subject: '<img src=x onerror=alert(1)>Question',
      message: '<script>bad()</script>Hello there'
    });

    expect(insertedRow.name).not.toContain('<');
    expect(insertedRow.phone).not.toContain('<');
    expect(insertedRow.subject).not.toContain('<');
    expect(insertedRow.message).not.toContain('<');
    expect(insertedRow.message).toContain('Hello there');
  });

  it('caps over-long input rather than rejecting it', async () => {
    await submitContactForm({
      ...valid,
      name: 'a'.repeat(500),
      message: 'b'.repeat(9000)
    });

    expect(insertedRow.name).toHaveLength(120);
    expect(insertedRow.message).toHaveLength(5000);
  });

  it('keeps line breaks in the message', async () => {
    await submitContactForm({
      ...valid,
      message: 'Line one\nLine two'
    });

    expect(insertedRow.message).toBe('Line one\nLine two');
  });

  it('rejects a malformed email', async () => {
    await expect(
      submitContactForm({ ...valid, email: 'not-an-email' })
    ).rejects.toThrow();
    expect(insert).not.toHaveBeenCalled();
  });

  it('rejects an empty message', async () => {
    await expect(
      submitContactForm({ ...valid, message: '   ' })
    ).rejects.toThrow();
    expect(insert).not.toHaveBeenCalled();
  });
});

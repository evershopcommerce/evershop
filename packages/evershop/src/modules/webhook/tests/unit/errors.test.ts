import { jest, describe, it, expect } from '@jest/globals';

jest.unstable_mockModule('../../../../lib/log/logger.js', () => ({
  error: jest.fn(),
  warning: jest.fn(),
  debug: jest.fn()
}));

const { WebhookNotFoundError, WebhookValidationError } = await import(
  '../../services/errors.js'
);
const { respondWithError } = await import('../../services/respondWithError.js');

const fakeResponse = () => {
  const res: any = { statusCode: 0, body: null };
  res.status = (s: number) => {
    res.statusCode = s;
    return res;
  };
  res.json = (b: unknown) => {
    res.body = b;
    return res;
  };
  return res;
};

describe('error classes', () => {
  // `instanceof` on an Error subclass breaks when it is compiled to an old
  // target, and respondWithError depends on it.
  it('survive compilation: instanceof works', () => {
    expect(new WebhookValidationError('x')).toBeInstanceOf(WebhookValidationError);
    expect(new WebhookValidationError('x')).toBeInstanceOf(Error);
    expect(new WebhookValidationError('x')).not.toBeInstanceOf(WebhookNotFoundError);
    expect(new WebhookNotFoundError('x')).toBeInstanceOf(WebhookNotFoundError);
  });
});

describe('respondWithError', () => {
  it('answers a validation error with 400 and its message', () => {
    const res = fakeResponse();
    respondWithError(res, new WebhookValidationError('Select at least one topic'));
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: { status: 400, message: 'Select at least one topic' }
    });
  });

  it('answers a not-found error with 404', () => {
    const res = fakeResponse();
    respondWithError(res, new WebhookNotFoundError('Webhook not found'));
    expect(res.statusCode).toBe(404);
  });

  it('answers anything else with 500', () => {
    const res = fakeResponse();
    respondWithError(res, new Error('db down'));
    expect(res.statusCode).toBe(500);
    expect(res.body.error.message).toBe('db down');
  });
});

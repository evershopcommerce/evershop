import { describe, it, expect } from '@jest/globals';
import { redactPayload } from '../../services/redactPayload.js';

describe('redactPayload', () => {
  it('removes a listed key from a customer row', () => {
    const customer = {
      customer_id: 1,
      email: 'a@b.com',
      password: '$2b$10$hash',
      full_name: 'A B'
    };
    expect(redactPayload(customer, ['password'])).toEqual({
      customer_id: 1,
      email: 'a@b.com',
      full_name: 'A B'
    });
  });

  it('removes the key at any depth, including inside arrays', () => {
    const data = {
      old: { password: 'x', id: 1 },
      new: [{ password: 'y', id: 2 }]
    };
    expect(redactPayload(data, ['password'])).toEqual({
      old: { id: 1 },
      new: [{ id: 2 }]
    });
  });

  it('does not mutate its input', () => {
    const data = { password: 'x', id: 1 };
    redactPayload(data, ['password']);
    expect(data).toEqual({ password: 'x', id: 1 });
  });

  it('passes primitives, null and dates through', () => {
    const date = new Date('2026-01-01T00:00:00Z');
    expect(redactPayload(null, ['password'])).toBeNull();
    expect(redactPayload('text', ['password'])).toBe('text');
    expect(redactPayload(7, ['password'])).toBe(7);
    expect(redactPayload({ at: date }, ['password'])).toEqual({ at: date });
  });

  it('honours extra fields an extension registers', () => {
    expect(
      redactPayload({ a: 1, secret_note: 'x' }, ['password', 'secret_note'])
    ).toEqual({ a: 1 });
  });
});

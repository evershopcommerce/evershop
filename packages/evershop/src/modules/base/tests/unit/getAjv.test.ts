import { describe, it, expect } from '@jest/globals';
import { getAjv } from '../../services/getAjv.js';

/**
 * `getAjv()` fills in the `default` keywords of a schema IN PLACE while it
 * validates. That is right for a create and wrong for an update that carries
 * only the fields to change (core issue #1103), so an update validator asks
 * for `{ useDefaults: false }`.
 */
const schema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    description: { type: 'array', default: [] },
    parent_id: { type: ['string', 'null'], default: null },
    code: { type: 'string', format: 'digit' }
  },
  additionalProperties: true
};

describe('getAjv', () => {
  it('fills in the defaults of omitted fields by default (the create path)', () => {
    const payload: Record<string, unknown> = { name: 'Shoes' };
    expect(getAjv().compile(schema)(payload)).toBe(true);
    expect(payload).toEqual({ name: 'Shoes', description: [], parent_id: null });
  });

  it('adds nothing with useDefaults: false (the update path)', () => {
    const payload: Record<string, unknown> = { name: 'Shoes' };
    expect(getAjv({ useDefaults: false }).compile(schema)(payload)).toBe(true);
    expect(payload).toEqual({ name: 'Shoes' });
  });

  it('keeps a value that is sent, null and an empty list included', () => {
    const payload: Record<string, unknown> = { description: [], parent_id: null };
    expect(getAjv({ useDefaults: false }).compile(schema)(payload)).toBe(true);
    expect(payload).toEqual({ description: [], parent_id: null });
  });

  it.each([
    ['by default', undefined],
    ['with useDefaults: false', { useDefaults: false }]
  ])('still reports every error and knows the digit format %s', (_label, options) => {
    const validate = getAjv(options as any).compile(schema);
    expect(validate({ name: 1, description: 'x', code: 'abc' })).toBe(false);
    expect(validate.errors!.length).toBeGreaterThanOrEqual(3);
    expect(validate({ code: '123' })).toBe(true);
  });
});

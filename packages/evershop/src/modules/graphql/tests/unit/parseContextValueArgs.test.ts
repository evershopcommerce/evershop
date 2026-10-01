import { describe, it, expect } from '@jest/globals';
import { getContextValue } from '../../services/contextHelper.js';
import { parseContextValueArgs } from '../../services/parseContextValueArgs.js';

/**
 * Regression test for the server-side `eval` in the SSR GraphQL query builder.
 *
 * Compiled `getContextValue(...)` tokens were resolved with
 * `eval('getContextValue(request, ' + decoded + ')')`, so a crafted token could
 * execute arbitrary JavaScript in the server process. The argument list is now
 * parsed as data with JSON5 (`parseContextValueArgs`) and spread into a direct
 * `getContextValue(request, ...)` call. A non-literal payload throws instead of
 * executing.
 */

const makeRequest = (context: Record<string, any>) =>
  ({
    locals: { context },
    app: { locals: { context: {} } }
  } as any);

describe('parseContextValueArgs', () => {
  it('parses a single quoted-string key argument', () => {
    expect(parseContextValueArgs('"orderUuid"')).toEqual(['orderUuid']);
  });

  it('parses a key plus a literal default', () => {
    expect(parseContextValueArgs('"missing", "fallback"')).toEqual([
      'missing',
      'fallback'
    ]);
    expect(parseContextValueArgs("'productId', null")).toEqual([
      'productId',
      null
    ]);
  });

  it('does NOT execute injected code — it throws instead', () => {
    const payload = '"x"]; (globalThis).__pwned_eval = true; [';
    expect(() => parseContextValueArgs(payload)).toThrow();
    expect((globalThis as any).__pwned_eval).toBeUndefined();
  });

  it('rejects a function-call payload (e.g. require/exec)', () => {
    expect(() =>
      parseContextValueArgs("require('child_process').execSync('id')")
    ).toThrow();
  });

  it('resolves a context value when spread into getContextValue', () => {
    const request = makeRequest({ orderUuid: 'abc-123' });
    expect(
      getContextValue(request, ...parseContextValueArgs('"orderUuid"'))
    ).toBe('abc-123');
    expect(
      getContextValue(request, ...parseContextValueArgs('"missing", "def"'))
    ).toBe('def');
  });
});

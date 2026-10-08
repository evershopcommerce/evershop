import { describe, it, expect } from '@jest/globals';
import {
  buildSignatureHeader,
  computeSignature
} from '../../services/sign.js';

describe('webhook signature', () => {
  // Computed independently with Python's hmac, not with this module.
  const VECTOR =
    '38877139021993b830af32feea6e18a8da83eb2f6e49ee50bd9e4cf4ca4d3789';

  it('matches a known HMAC-SHA256 vector over "<timestamp>.<body>"', () => {
    expect(computeSignature('whsec_test', 1700000000, '{"a":1}')).toBe(VECTOR);
  });

  it('builds the header as t=<seconds>,v1=<hex>', () => {
    const header = buildSignatureHeader(
      'whsec_test',
      '{"a":1}',
      1700000000999
    );
    expect(header).toBe(`t=1700000000,v1=${VECTOR}`);
  });

  it('changes when the body, the secret or the timestamp changes', () => {
    const base = computeSignature('s', 1, 'body');
    expect(computeSignature('s', 1, 'body2')).not.toBe(base);
    expect(computeSignature('s2', 1, 'body')).not.toBe(base);
    expect(computeSignature('s', 2, 'body')).not.toBe(base);
  });
});

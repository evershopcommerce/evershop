import { describe, expect, it } from '@jest/globals';
import {
  decodeCursor,
  encodeCursor,
  InvalidCursorError
} from '../../cursor.js';

describe('pagination cursors', () => {
  it('round-trips a provider token', () => {
    const cursor = encodeCursor('s3', 'native', 'some/continuation/token==');
    expect(decodeCursor(cursor, 's3')).toEqual({
      kind: 'native',
      token: 'some/continuation/token=='
    });
  });

  it('treats an absent cursor as the first page', () => {
    expect(decodeCursor(undefined, 's3')).toBeUndefined();
    expect(decodeCursor('', 's3')).toBeUndefined();
  });

  it('is opaque: the token is not readable from the cursor', () => {
    const cursor = encodeCursor('s3', 'native', 'token');
    expect(cursor).not.toContain('token');
  });

  it('refuses a cursor issued by a different provider', () => {
    // The storage backend is switchable at runtime, so an open tab can hold a
    // cursor from the provider that was active a moment ago. Handing an S3
    // continuation token to Azure would fail obscurely, or page wrongly.
    const cursor = encodeCursor('s3', 'native', 'token');
    expect(() => decodeCursor(cursor, 'azure')).toThrow(InvalidCursorError);
    expect(() => decodeCursor(cursor, 'azure')).toThrow(/"s3"/);
  });

  it('refuses a malformed cursor', () => {
    expect(() => decodeCursor('not-base64-json', 's3')).toThrow(
      InvalidCursorError
    );
    expect(() =>
      decodeCursor(Buffer.from('{"v":9}').toString('base64url'), 's3')
    ).toThrow(InvalidCursorError);
    // An envelope with no `k` is from before cursors recorded who minted
    // them; refusing it is safer than guessing, and only costs a re-listing.
    expect(() =>
      decodeCursor(
        Buffer.from('{"v":1,"p":"s3","t":"x"}').toString('base64url'),
        's3'
      )
    ).toThrow(InvalidCursorError);
  });

  it('survives a token containing characters that need encoding', () => {
    const token = 'a+b/c=d e&f?g#h';
    expect(
      decodeCursor(encodeCursor('gcs', 'native', token), 'gcs')?.token
    ).toBe(token);
  });
});

/**
 * Pagination cursors for the file browser.
 *
 * Every provider's native cursor is its own thing — an S3 continuation token,
 * an Azure continuation token, a GCS page token, a file name on local disk —
 * and none of them are meaningful to any other provider. The storage backend
 * can be switched at runtime from the System Setting page, so a cursor held by
 * an open browser tab can outlive the provider that issued it.
 *
 * So a cursor leaves this module tagged with the provider that made it and is
 * refused on the way back in if the tag no longer matches. The alternative —
 * handing a raw S3 token to Azure — surfaces as an opaque SDK error, or worse,
 * as a silently wrong page.
 *
 * The encoding is base64url of a small JSON envelope. It is obfuscation, not
 * security: the cursor is not a capability and carries nothing secret. Callers
 * must treat it as opaque.
 */

/**
 * Who minted the token, which decides how it may be used.
 *
 * `native` — the provider's own continuation token. Opaque. It must be handed
 *   straight back to that provider and MUST NOT be compared against file
 *   names: an S3 continuation token is not a name, and treating it as one
 *   silently drops entries.
 * `name`  — a file name this service minted, because the provider ignored
 *   `options` and returned the whole folder. Paging is ours to do, by seeking
 *   past that name.
 */
export type CursorKind = 'native' | 'name';

interface CursorEnvelope {
  /** Envelope version, so the shape can change without breaking open tabs. */
  v: 1;
  /** Provider id that issued the token (`local`, `s3`, `azure`, `gcs`, …). */
  p: string;
  /** Who minted `t`. */
  k: CursorKind;
  /** The token itself. */
  t: string;
}

export interface DecodedCursor {
  kind: CursorKind;
  token: string;
}

export class InvalidCursorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCursorError';
  }
}

export function encodeCursor(
  provider: string,
  kind: CursorKind,
  token: string
): string {
  const envelope: CursorEnvelope = { v: 1, p: provider, k: kind, t: token };
  return Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64url');
}

/**
 * Unwrap a cursor for `provider`.
 *
 * Returns `undefined` for an absent cursor (the first page). Throws
 * `InvalidCursorError` for one that is malformed or was issued by a different
 * provider — the caller turns that into a 400, which tells an open tab to
 * start the listing again rather than leaving it stuck on a page that cannot
 * be fetched.
 */
export function decodeCursor(
  cursor: string | undefined,
  provider: string
): DecodedCursor | undefined {
  if (cursor === undefined || cursor === '') {
    return undefined;
  }
  let envelope: unknown;
  try {
    envelope = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new InvalidCursorError('The pagination cursor is not valid');
  }
  if (
    typeof envelope !== 'object' ||
    envelope === null ||
    (envelope as CursorEnvelope).v !== 1 ||
    typeof (envelope as CursorEnvelope).p !== 'string' ||
    typeof (envelope as CursorEnvelope).t !== 'string' ||
    ((envelope as CursorEnvelope).k !== 'native' &&
      (envelope as CursorEnvelope).k !== 'name')
  ) {
    throw new InvalidCursorError('The pagination cursor is not valid');
  }
  const { p, k, t } = envelope as CursorEnvelope;
  if (p !== provider) {
    throw new InvalidCursorError(
      `The pagination cursor was issued for the "${p}" file storage, but "${provider}" is active`
    );
  }
  return { kind: k, token: t };
}

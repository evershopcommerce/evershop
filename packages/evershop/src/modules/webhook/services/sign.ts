import crypto from 'crypto';

/** HMAC-SHA256 (hex) of `<timestamp>.<body>`, keyed with the webhook secret. */
export function computeSignature(
  secret: string,
  timestamp: number,
  body: string
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');
}

/**
 * Value of the `X-EverShop-Signature` header: `t=<unix seconds>,v1=<hex>`.
 * The timestamp is part of the signed string, so a receiver can reject an old
 * request that someone replays.
 */
export function buildSignatureHeader(
  secret: string,
  body: string,
  nowMs: number = Date.now()
): string {
  const timestamp = Math.floor(nowMs / 1000);
  return `t=${timestamp},v1=${computeSignature(secret, timestamp, body)}`;
}

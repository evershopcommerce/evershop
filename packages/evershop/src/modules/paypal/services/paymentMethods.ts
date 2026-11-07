/**
 * Every checkout payment method this module serves. Venmo is a PayPal funding
 * source: same credentials, same PayPal order, same statuses and money
 * handlers — only the buyer-facing approval differs (JS SDK button instead of
 * a redirect). Anything that looks up a local order by its PayPal order must
 * accept all of them.
 */
export const PAYPAL_METHOD_CODES = ['paypal', 'venmo'];

/** Venmo only settles in US dollars. */
export const VENMO_CURRENCIES = ['USD'];

/**
 * An enable flag from the admin (1/0, stored as a string) or from config
 * (1/0 or true/false).
 */
export function isPaymentMethodEnabled(value: unknown): boolean {
  return value === true || parseInt(String(value), 10) === 1;
}

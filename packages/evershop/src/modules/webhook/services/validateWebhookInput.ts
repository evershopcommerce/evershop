import { MAX_NAME_LENGTH } from './constants.js';
import { WebhookValidationError } from './errors.js';

export function validateName(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new WebhookValidationError('Webhook name is required');
  }
  const name = value.trim();
  if (name.length > MAX_NAME_LENGTH) {
    throw new WebhookValidationError(
      `Webhook name must be at most ${MAX_NAME_LENGTH} characters`
    );
  }
  return name;
}

/**
 * The admin form posts a toggle as a boolean; accept 0/1 too, as the other
 * admin forms do. `undefined` keeps the fallback.
 */
export function parseEnabled(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (value === true || value === 1 || value === '1' || value === 'true') {
    return true;
  }
  if (value === false || value === 0 || value === '0' || value === 'false') {
    return false;
  }
  throw new WebhookValidationError('Enabled must be true or false');
}

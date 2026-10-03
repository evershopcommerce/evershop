import type { AddressError } from '../../../../../lib/address/types.js';

/**
 * Thrown by the address services when `validateAddress` rejects a payload
 * (spec § 3.8). Carries the field-targeted, already translated errors so the
 * REST handlers can answer `INVALID_PAYLOAD` with `error.errors[]` and the
 * client can highlight the inputs. `message` joins them for logs and for
 * callers that only read `Error.message`.
 */
export class AddressValidationError extends Error {
  readonly errors: AddressError[];

  constructor(errors: AddressError[], message?: string) {
    super(
      message ??
        (errors.map((e) => e.message).filter(Boolean).join(', ') ||
          'Invalid address')
    );
    this.name = 'AddressValidationError';
    this.errors = errors;
  }
}

export function isAddressValidationError(
  error: unknown
): error is AddressValidationError {
  return (
    error instanceof AddressValidationError ||
    (typeof error === 'object' &&
      error !== null &&
      (error as { name?: unknown }).name === 'AddressValidationError' &&
      Array.isArray((error as { errors?: unknown }).errors))
  );
}

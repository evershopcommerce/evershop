import { INVALID_PAYLOAD } from '../../../../../lib/util/httpStatus.js';
import { isAddressValidationError } from './AddressValidationError.js';

interface ResponseLike {
  status(code: number): unknown;
  json(body: unknown): unknown;
}

/**
 * Shared by the six address REST handlers (spec § 3.8): an
 * `AddressValidationError` becomes `INVALID_PAYLOAD` with the field-targeted
 * `errors[]` under `error`, so the client can highlight the inputs. Returns
 * `true` when the response was sent, `false` for any other error.
 */
export function respondAddressValidationError(
  response: ResponseLike,
  error: unknown
): boolean {
  if (!isAddressValidationError(error)) {
    return false;
  }
  response.status(INVALID_PAYLOAD);
  response.json({
    error: {
      status: INVALID_PAYLOAD,
      message: error.message,
      errors: error.errors
    }
  });
  return true;
}

import { error as logError } from '../../../lib/log/logger.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  NOT_FOUND
} from '../../../lib/util/httpStatus.js';
import { WebhookNotFoundError, WebhookValidationError } from './errors.js';

/** Answer an API request that failed: 400 / 404 for ours, 500 otherwise. */
export function respondWithError(response: any, e: any): void {
  let status = INTERNAL_SERVER_ERROR;
  if (e instanceof WebhookValidationError) {
    status = INVALID_PAYLOAD;
  } else if (e instanceof WebhookNotFoundError) {
    status = NOT_FOUND;
  } else {
    logError(e);
  }
  response.status(status);
  response.json({ error: { status, message: e.message } });
}

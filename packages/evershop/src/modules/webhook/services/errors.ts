/**
 * A problem with what the admin submitted (bad URL, unknown topic, too many
 * webhooks, ...). The API answers these with 400 instead of 500.
 */
export class WebhookValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookValidationError';
  }
}

/** The webhook or delivery the request refers to does not exist (404). */
export class WebhookNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookNotFoundError';
  }
}

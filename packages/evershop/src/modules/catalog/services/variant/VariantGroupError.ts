export type VariantGroupErrorCode =
  | 'NO_ATTRIBUTES'
  | 'TOO_MANY_ATTRIBUTES'
  | 'ATTRIBUTE_NOT_SELECT'
  | 'ATTRIBUTE_NOT_IN_GROUP'
  | 'GROUP_NOT_FOUND'
  | 'PRODUCT_NOT_ELIGIBLE';

/**
 * A refusal by the variant group services: the input cannot make or join a
 * group. Anything else they throw is a failure of the database and not of the
 * input. The admin API answers a `VariantGroupError` with 400 and the message.
 */
export class VariantGroupError extends Error {
  readonly code: VariantGroupErrorCode;

  constructor(code: VariantGroupErrorCode, message: string) {
    super(message);
    this.name = 'VariantGroupError';
    this.code = code;
  }
}

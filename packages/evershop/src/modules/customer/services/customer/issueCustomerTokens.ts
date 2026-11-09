import {
  generateRefreshToken,
  generateToken,
  TOKEN_TYPES
} from '../../../../lib/util/jwt.js';
import type { CurrentCustomer } from '../../../../types/request.js';
import { buildCustomerPayload } from './buildCustomerPayload.js';
import { getActiveCustomer } from './getActiveCustomer.js';

export interface CustomerTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Signs the access and refresh tokens for a safe customer payload
 * (`buildCustomerPayload`). `POST /api/customer/tokens` uses it after the
 * password check, and `issueCustomerTokens` after its own.
 */
export function signCustomerTokens(customer: CurrentCustomer): CustomerTokens {
  return {
    accessToken: generateToken({ customer }, TOKEN_TYPES.CUSTOMER),
    refreshToken: generateRefreshToken({ customer }, TOKEN_TYPES.CUSTOMER)
  };
}

/**
 * The tokens `POST /api/customer/tokens` returns, for a customer an extension
 * has identified without a password, such as a social login on a headless
 * storefront. Only an active account (status 1) gets tokens; anything else
 * throws.
 */
export async function issueCustomerTokens(
  customerId: number
): Promise<CustomerTokens> {
  const customer = await getActiveCustomer(customerId);
  if (!customer) {
    throw new Error('The customer does not exist or is disabled');
  }
  return signCustomerTokens(buildCustomerPayload(customer));
}

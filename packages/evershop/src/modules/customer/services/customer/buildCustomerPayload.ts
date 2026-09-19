import type { CustomerRow } from '../../../../types/db/index.js';
import type { CurrentCustomer } from '../../../../types/request.js';

/**
 * Builds a safe CurrentCustomer payload from a raw CustomerRow.
 * Uses an explicit allowlist to ensure sensitive fields (e.g. password)
 * are never included in JWT payloads or request locals.
 */
export function buildCustomerPayload(customer: CustomerRow): CurrentCustomer {
  return {
    customer_id: customer.customer_id,
    group_id: customer.group_id ?? 0,
    uuid: customer.uuid,
    email: customer.email,
    full_name: customer.full_name ?? '',
    status: customer.status,
    created_at: customer.created_at,
    updated_at: customer.updated_at
  };
}

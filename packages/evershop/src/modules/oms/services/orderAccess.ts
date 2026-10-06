import type { EvershopRequest } from '../../../types/request.js';
import { setContextValue } from '../../graphql/services/contextHelper.js';

/**
 * How a caller proved it may see an order.
 *
 * - `customer`       the logged-in customer owns the order
 * - `session`        guest checkout: the order was placed in this browser session
 * - `tracking_token` the signed link from an order or shipment email
 * - `custom`         an extension's own proof, set through `grantOrderAccess`
 */
export type OrderAccessProof =
  | 'customer'
  | 'session'
  | 'tracking_token'
  | 'custom';

/** A proof, or `admin` (an authenticated admin session). */
export type OrderAccessMethod = 'admin' | OrderAccessProof;

/**
 * Left in the request context by a page that has already proven the visitor
 * may see ONE order. Request-level only: it is written with
 * `setContextValue(request, …)` and never on the app, so it cannot outlive the
 * request. GraphQL variables cannot set it; only server code can.
 */
export interface VerifiedOrderMarker {
  uuid: string;
  via: OrderAccessProof;
}

/** The parts of the GraphQL resolver context this check reads. */
export interface OrderAccessContext {
  user?: unknown;
  customer?: { customer_id?: number | string | null } | null;
  verifiedOrder?: VerifiedOrderMarker | null;
  [key: string]: unknown;
}

/** The parts of an `order` row this check reads. */
export interface OrderAccessSubject {
  uuid?: string | null;
  customer_id?: number | string | null;
}

export interface CanAccessOrderOptions {
  /** Which proofs count. Default: all of them. */
  allow?: readonly OrderAccessMethod[];
}

const ALL_METHODS: readonly OrderAccessMethod[] = [
  'admin',
  'customer',
  'session',
  'tracking_token',
  'custom'
];

/**
 * Whether the current GraphQL caller may see this order. A visitor with the
 * order's UUID is not enough: the UUID appears in emailed links and URLs, and
 * `/api/graphql` is a public endpoint.
 *
 * Three kinds of proof, all already present in the context:
 *   1. `context.user`: an admin session.
 *   2. `context.customer`: the logged-in customer owns the order. A guest order
 *      (`customer_id` null) never matches.
 *   3. `context.verifiedOrder`: a page proved access to this order and said how
 *      (`grantOrderAccess`).
 */
export function canAccessOrder(
  context: OrderAccessContext | null | undefined,
  order: OrderAccessSubject | null | undefined,
  options: CanAccessOrderOptions = {}
): boolean {
  if (!context || !order || !order.uuid) {
    return false;
  }
  const allow = options.allow ?? ALL_METHODS;

  if (allow.includes('admin') && context.user) {
    return true;
  }

  if (allow.includes('customer')) {
    const customerId = context.customer?.customer_id;
    if (
      customerId !== undefined &&
      customerId !== null &&
      order.customer_id !== undefined &&
      order.customer_id !== null &&
      String(customerId) === String(order.customer_id)
    ) {
      return true;
    }
  }

  const marker = context.verifiedOrder;
  if (
    marker &&
    typeof marker.uuid === 'string' &&
    allow.includes(marker.via) &&
    marker.uuid.toLowerCase() === String(order.uuid).toLowerCase()
  ) {
    return true;
  }

  return false;
}

/**
 * Call this from a page middleware AFTER it has proven the visitor may see the
 * order (a signed token checked, a session matched, …). It lets the page's own
 * GraphQL query, which runs later in the same request, read that order.
 *
 * Do not call it for a proof you have not checked: a login alone is not enough,
 * because the page does not know whose order the UUID in the URL is.
 */
export function grantOrderAccess(
  request: EvershopRequest,
  orderUuid: string,
  via: OrderAccessProof
): void {
  const marker: VerifiedOrderMarker = { uuid: orderUuid, via };
  setContextValue(request, 'verifiedOrder', marker);
}

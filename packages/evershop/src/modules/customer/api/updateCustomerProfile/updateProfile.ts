import { select } from '@evershop/postgres-query-builder';
import { translate } from '../../../../lib/locale/translate/translate.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK,
  UNAUTHORIZED
} from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import updateCustomer from '../../services/customer/updateCustomer.js';

/**
 * The payload is intentionally open (`additionalProperties: true`) so that
 * extensions can let customers edit their own custom profile columns. We only
 * strip the fields a customer must never be able to set on themselves:
 *  - `password`: changed only through the dedicated change-password flow, which
 *    verifies the current password.
 *  - `group_id` / `status`: privilege escalation — self-promoting into another
 *    customer/pricing group, or re-activating a disabled account.
 */
const SENSITIVE_FIELDS = ['password', 'group_id', 'status'] as const;

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next: () => void
) => {
  try {
    // Identify the customer from the authenticated context ONLY — never from a
    // URL param or the request body. `getCurrentCustomer()` is populated by the
    // global customer-auth middleware, either from the signed session cookie or
    // a customer JWT (`Authorization: Bearer ...`).
    const currentCustomer = request.getCurrentCustomer();
    if (!currentCustomer) {
      response.status(UNAUTHORIZED);
      return response.json({
        error: {
          status: UNAUTHORIZED,
          message: translate('You must be logged in to update your profile')
        }
      });
    }

    // Take the whole body (so extension fields flow through) but strip the
    // sensitive fields a customer must not be able to set on themselves.
    const data: Record<string, unknown> = { ...request.body };
    SENSITIVE_FIELDS.forEach((field) => {
      delete data[field];
    });

    if (Object.keys(data).length === 0) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: translate('There is nothing to update')
        }
      });
    }

    // If the email is changing, make sure it is not already used by someone else.
    if (
      typeof data.email === 'string' &&
      data.email !== currentCustomer.email
    ) {
      const existing = await select()
        .from('customer')
        .where('email', '=', data.email)
        .load(pool);
      if (existing && existing.uuid !== currentCustomer.uuid) {
        response.status(INVALID_PAYLOAD);
        return response.json({
          error: {
            status: INVALID_PAYLOAD,
            message: translate('Email is already used')
          }
        });
      }
    }

    // Reuse the shared service: it validates, runs in a transaction, fires the
    // customer hooks, and strips `password` from the data before writing.
    const customer = await updateCustomer(currentCustomer.uuid, data, {
      routeId: request.currentRoute.id
    });

    response.status(OK);
    response.$body = {
      data: {
        ...customer,
        links: [
          {
            rel: 'self',
            href: buildUrl('updateCustomerProfile'),
            action: 'PATCH',
            types: ['application/json']
          }
        ]
      }
    };
    return next();
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};

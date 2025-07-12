import { select, update } from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import { hashPassword } from '../../../../lib/util/passwordHelper.js';

export default async (request, response, next) => {
  const connection = await getConnection();
  try {
    const customer = await select()
      .from('customer')
      .where('uuid', '=', request.params.id)
      .load(connection, false);

    if (!customer) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid customer id'
        }
      });
      return;
    }

    // Check if password is set
    if (request.body.password) {
      // Hash the password
      request.body.password = hashPassword(request.body.password);
    }

    await update('customer')
      .given({
        ...request.body,
        group_id: 1 // TODO: fix me
      })
      .where('uuid', '=', request.params.id)
      .execute(connection, false);

    // Load updated customer
    const updatedCustomer = await select()
      .from('customer')
      .where('uuid', '=', request.params.id)
      .load(connection);

    response.status(OK);
    response.$body = {
      data: {
        ...updatedCustomer,
        links: [
          {
            rel: 'customerGrid',
            href: buildUrl('customerGrid'),
            action: 'GET',
            types: ['text/xml']
          },
          {
            rel: 'edit',
            href: buildUrl('customerEdit', { id: customer.uuid }),
            action: 'GET',
            types: ['text/xml']
          }
        ]
      }
    };
    next();
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};

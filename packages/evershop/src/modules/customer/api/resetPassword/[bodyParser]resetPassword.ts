import crypto from 'crypto';
import { insert, select } from '@evershop/postgres-query-builder';
import { translate } from '../../../../lib/locale/translate/translate.js';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import { OK, INTERNAL_SERVER_ERROR } from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { sendResetPasswordEmail } from '../../services/sendResetPasswordEmail.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  const { body } = request;
  const { email } = body;
  try {
    const config = getConfig('system.notification_emails.reset_password', {
      enabled: true
    });
    if (config?.enabled === false) {
      throw new Error('Reset password email is disabled in config.');
    }
    // Generate a random token using crypto module
    const token = crypto.randomBytes(64).toString('hex');

    // Hash the token
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    // Check if email is existed
    const existingCustomer = await select()
      .from('customer')
      .where('email', '=', email)
      .load(pool);

    if (existingCustomer) {
      // Insert token to reset_password_token table
      await insert('reset_password_token')
        .given({
          customer_id: existingCustomer.customer_id,
          token: hash
        })
        .execute(pool);
    }
    await sendResetPasswordEmail(email, existingCustomer, token);
    response.status(OK);
    response.json({
      data: {}
    });

    return;
  } catch (e) {
    error(e);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: translate('Something went wrong. Please try again later.')
      }
    });
  }
};

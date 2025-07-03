import crypto from 'crypto';
import { select, del } from '@evershop/postgres-query-builder';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} from '../../../../lib/util/httpStatus.js';
import updatePassword from '../../services/customer/updatePassword.js';

export default async (request, response, next) => {
  const { body } = request;

  try {
    // Generate a random token using crypto module
    const { token, password } = body;

    // Hash the token
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    // Check if token is existed and created not more than 48 hours, created_at is timestamp with time zone UTC
    const resetTokenLifetime = getConfig(
      'resetPasswordTokenLifetime',
      48 * 60 * 60 * 1000
    );

    // Convert Date object to mysql timestamp
    dayjs.extend(utc);
    dayjs.extend(timezone);
    const timezoneConfig = getConfig('shop.timezone', 'UTC');
    const now = dayjs
      .tz(new Date(Date.now() - resetTokenLifetime), timezoneConfig)
      .format('YYYY-MM-DD HH:mm:ss');

    const existingToken = await select()
      .from('reset_password_token')
      .where('token', '=', hash)
      .and('created_at', '>=', now)
      .load(pool);

    if (!existingToken) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Token is invalid or expired'
        }
      });
      return;
    }

    await updatePassword(existingToken.customer_id, password, {
      routeId: request.currentRoute.id
    });

    // Delete the token
    await del('reset_password_token')
      .where(
        'reset_password_token_id',
        '=',
        existingToken.reset_password_token_id
      )
      .execute(pool);

    response.status(OK);
    response.$body = {};
    next();
  } catch (e) {
    error(e);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};

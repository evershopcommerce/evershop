import {
  INTERNAL_SERVER_ERROR,
  OK
} from '../../../../lib/util/httpStatus.js';
import type { EvershopRequest } from '../../../../types/request.js';
import { createPackage } from '../../services/package/packageManager.js';

/**
 * POST /api/packages — create a package size. Numeric fields may arrive as
 * strings (HTML form inputs); the service validates and the DB columns are
 * numeric. Business errors (duplicate name, bad dimensions) surface with
 * their message — the admin form shows them inline.
 */
export default async (request: EvershopRequest, response, next) => {
  try {
    const { name, length, width, height, weight, is_default } = request.body;
    const row = await createPackage({
      name,
      length: length !== undefined ? Number(length) : undefined,
      width: width !== undefined ? Number(width) : undefined,
      height: height !== undefined ? Number(height) : undefined,
      weight: weight !== undefined && weight !== '' ? Number(weight) : undefined,
      is_default: is_default === true || is_default === 'true' || is_default === 1
    });
    response.status(OK);
    response.json({ data: row });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: (e as Error).message
      }
    });
  }
};

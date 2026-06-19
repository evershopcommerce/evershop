import {
  INTERNAL_SERVER_ERROR,
  OK
} from '../../../../lib/util/httpStatus.js';
import type { EvershopRequest } from '../../../../types/request.js';
import { updatePackage } from '../../services/package/packageManager.js';

/**
 * PATCH /api/packages/:id — partial update of a package size (id = uuid).
 * Setting `is_default: true` swaps the default in one transaction; setting
 * `is_default: false` on the current default is rejected (there must always
 * be a default — make another package the default instead).
 */
export default async (request: EvershopRequest, response, next) => {
  try {
    const { id } = request.params;
    const { name, length, width, height, weight, is_default } = request.body;
    const row = await updatePackage(id as string, {
      name,
      length: length !== undefined ? Number(length) : undefined,
      width: width !== undefined ? Number(width) : undefined,
      height: height !== undefined ? Number(height) : undefined,
      weight: weight !== undefined && weight !== '' ? Number(weight) : undefined,
      is_default:
        is_default === undefined
          ? undefined
          : is_default === true || is_default === 'true' || is_default === 1
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

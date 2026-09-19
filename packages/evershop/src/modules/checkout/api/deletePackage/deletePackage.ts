import {
  INTERNAL_SERVER_ERROR,
  OK
} from '../../../../lib/util/httpStatus.js';
import type { EvershopRequest } from '../../../../types/request.js';
import { deletePackage } from '../../services/package/packageManager.js';

/**
 * DELETE /api/packages/:id (id = uuid). Refuses to delete the default
 * package ("set another default first") and any package still referenced by
 * products (FK RESTRICT — the error reports how many products block it).
 */
export default async (request: EvershopRequest, response, next) => {
  try {
    const { id } = request.params;
    await deletePackage(id as string);
    response.status(OK);
    response.json({ data: { uuid: id } });
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

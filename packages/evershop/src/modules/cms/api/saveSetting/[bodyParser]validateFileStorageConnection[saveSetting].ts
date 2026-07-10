import { INVALID_PAYLOAD } from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { validateFileStorageSave } from '../../services/storage/verifyConnection.js';

/**
 * Gate the System Setting save: when the payload switches to (or updates) a
 * cloud file-storage provider, the connection must actually work with the
 * submitted values or the save is rejected. Contributed by the cms module to
 * the setting module's saveSetting route (middleware attaches by route id).
 */
export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next: (error?: Error) => void
) => {
  const failure = await validateFileStorageSave(request.body || {});
  if (failure) {
    response.status(INVALID_PAYLOAD).json({
      error: {
        status: INVALID_PAYLOAD,
        message: failure
      }
    });
    return;
  }
  next();
};

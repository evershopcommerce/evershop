import { OK } from '@evershop/evershop/src/lib/util/httpStatus.js';
import { deleteFile } from '../../services/deleteFile.js';

// eslint-disable-next-line no-unused-vars
export default async (request, response, delegate, next) => {
  const path = request.params[0] || '';
  await deleteFile(path);
  response.status(OK).json({
    data: {
      path
    }
  });
};

import { OK } from '../../../../lib/util/httpStatus.js';
import { deleteFile } from '../../services/deleteFile.js';

export default async (request, response, next) => {
  const path = request.params[0] || '';
  await deleteFile(path);
  response.status(OK).json({
    data: {
      path
    }
  });
};

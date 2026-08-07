import { basename } from 'path';
import { OK } from '../../../../lib/util/httpStatus.js';
import { createFolder } from '../../services/createFolder.js';

export default async (request, response, next) => {
  const { path } = request.body || '';
  await createFolder(path);
  response.status(OK).json({
    data: {
      path,
      name: basename(path)
    }
  });
};

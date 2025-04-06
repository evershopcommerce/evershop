import { basename } from 'path';
import { OK } from '@evershop/evershop/src/lib/util/httpStatus.js';
import { createFolder } from '../../services/createFolder.js';

// eslint-disable-next-line no-unused-vars
export default async (request, response, delegate, next) => {
  const { path } = request.body || '';
  await createFolder(path);
  response.status(OK).json({
    data: {
      path,
      name: basename(path)
    }
  });
};

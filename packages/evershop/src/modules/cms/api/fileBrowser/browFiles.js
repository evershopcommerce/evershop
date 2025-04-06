import { OK } from '@evershop/evershop/src/lib/util/httpStatus.js';
import { browFiles } from '../../services/browFiles.js';

// eslint-disable-next-line no-unused-vars
export default async (request, response, delegate, next) => {
  const path = request.params[0] || '';
  const results = await browFiles(path);
  response.status(OK);
  response.json({
    data: results
  });
};

import { OK } from '../../../../lib/util/httpStatus.js';
import { browFiles } from '../../services/browFiles.js';

export default async (request, response, next) => {
  const path = request.params[0] || '';
  const results = await browFiles(path);
  response.status(OK);
  response.json({
    data: results
  });
};

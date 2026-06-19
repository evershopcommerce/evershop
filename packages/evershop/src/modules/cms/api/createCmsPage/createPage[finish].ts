import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { createPage } from '../../services/page/createPage.js';

export default async (request: EvershopRequest, response: EvershopResponse) => {
  const data = request.body;
  const result = await createPage(data, {
    routeId: request.currentRoute.id
  });

  return result;
};

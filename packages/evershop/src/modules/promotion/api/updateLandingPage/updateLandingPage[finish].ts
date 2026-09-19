import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import updateLandingPage from '../../services/landingPage/updateLandingPage.js';

export default async (request: EvershopRequest, response: EvershopResponse) => {
  const page = await updateLandingPage(request.params.id as string, request.body, {
    routeId: request.currentRoute.id
  });

  return page;
};

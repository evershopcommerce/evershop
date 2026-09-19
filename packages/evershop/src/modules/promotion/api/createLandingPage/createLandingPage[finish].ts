import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { createLandingPage } from '../../services/landingPage/createLandingPage.js';

export default async (request: EvershopRequest, response: EvershopResponse) => {
  const page = await createLandingPage(request.body, {
    routeId: request.currentRoute.id
  });

  return page;
};

import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { OK } from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { duplicateLandingPage } from '../../services/landingPage/duplicateLandingPage.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  try {
    const copy = await duplicateLandingPage(request.params.id as string, {});
    response.status(OK).json({
      data: {
        ...copy,
        links: [
          {
            rel: 'edit',
            href: buildUrl('landingPageEdit', { id: copy.uuid }),
            action: 'GET',
            types: ['text/xml']
          }
        ]
      }
    });
  } catch (e) {
    next(e);
  }
};

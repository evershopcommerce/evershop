import { OK } from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { deleteLandingPage } from '../../services/landingPage/deleteLandingPage.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  try {
    const page = await deleteLandingPage(request.params.id as string, {});
    response.status(OK).json({
      data: page
    });
  } catch (e) {
    next(e);
  }
};

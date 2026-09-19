import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { deleteContactSubmission } from '../../services/contact/deleteContactSubmission.js';

export default async (request: EvershopRequest, response: EvershopResponse) => {
  const uuid = request.params.id as string;
  return await deleteContactSubmission(uuid);
};

import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import {
  ContactSubmissionStatus,
  updateContactSubmissionStatus
} from '../../services/contact/updateContactSubmissionStatus.js';

export default async (request: EvershopRequest, response: EvershopResponse) => {
  const uuid = request.params.id as string;
  const { status } = (request.body || {}) as {
    status: ContactSubmissionStatus;
  };
  return await updateContactSubmissionStatus(uuid, status);
};

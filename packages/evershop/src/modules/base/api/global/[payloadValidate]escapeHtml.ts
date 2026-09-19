import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import escapePayload from '../../services/escapePayload.js';

export default (request: EvershopRequest, response: EvershopResponse, next) => {
  if (request.method === 'GET') {
    next();
  } else {
    escapePayload(request.body);
    next();
  }
};

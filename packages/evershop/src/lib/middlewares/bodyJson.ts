import bodyParser from 'body-parser';
import { EvershopRequest } from '../../types/request.js';
import { EvershopResponse } from '../../types/response.js';

export default (request: EvershopRequest, response: EvershopResponse, next) => {
  bodyParser.json()(request, response, next);
};

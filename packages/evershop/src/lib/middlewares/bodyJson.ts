import bodyParser from 'body-parser';
import { EvershopRequest, EvershopResponse } from '../../types/index.js';

export default (request: EvershopRequest, response: EvershopResponse, next) => {
  bodyParser.json()(request, response, next);
};

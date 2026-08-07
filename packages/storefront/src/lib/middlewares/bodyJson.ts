import bodyParser from 'body-parser';
import { StorefrontRequest, StorefrontResponse } from '../../types/index.js';

export default (request: StorefrontRequest, response: StorefrontResponse, next) => {
  bodyParser.json()(request, response, next);
};

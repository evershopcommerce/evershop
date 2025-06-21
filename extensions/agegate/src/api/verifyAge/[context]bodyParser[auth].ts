import { EvershopRequest, EvershopResponse } from '@evershop/evershop';
import bodyParser from 'body-parser';

export default (
  request: EvershopRequest,
  response: EvershopResponse,
  delegate,
  next
) => {
  bodyParser.json({ inflate: false })(request, response, next);
};

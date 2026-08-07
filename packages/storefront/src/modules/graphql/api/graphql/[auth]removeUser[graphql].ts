import { StorefrontRequest } from '../../../../types/request.js';
import { setContextValue } from '../../services/contextHelper.js';

export default (request: StorefrontRequest, response, next) => {
  // This /api/graphql endpoint is used for customer GraphQL requests
  // Set user to undefined as this is for customers
  setContextValue(request, 'user', undefined);
  next();
};

import validate from '../addShippingZoneMethod/validateMethod.js';

export default async (request, response, delegate, next) =>
  validate(request, response, delegate, next);

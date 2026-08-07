import validate from '../addShippingZoneMethod/validateMethod.js';

export default async (request, response, next) =>
  validate(request, response, next);

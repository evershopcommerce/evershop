import createProductAttribute from '../../services/attribute/createProductAttribute.js';

// eslint-disable-next-line no-unused-vars
export default async (request, response, delegate) => {
  const attribute = await createProductAttribute(request.body, {
    routeId: request.currentRoute.id
  });
  return attribute;
};

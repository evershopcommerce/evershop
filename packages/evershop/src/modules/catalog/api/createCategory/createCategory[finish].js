import createCategory from '../../services/category/createCategory.js';

export default async (request, response) => {
  const result = await createCategory(request.body, {
    routeId: request.currentRoute.id
  });
  return result;
};

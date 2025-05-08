import updateCategory from '../../services/category/updateCategory.js';

export default async (request, response, delegate) => {
  const category = await updateCategory(request.params.id, request.body, {
    routeId: request.currentRoute.id
  });
  return category;
};

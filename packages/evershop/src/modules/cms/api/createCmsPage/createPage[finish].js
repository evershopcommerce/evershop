import createPage from '../../services/page/createPage.js';

// eslint-disable-next-line no-unused-vars
export default async (request, response, delegate) => {
  const data = request.body;
  const result = await createPage(data, {
    routeId: request.currentRoute.id
  });

  return result;
};

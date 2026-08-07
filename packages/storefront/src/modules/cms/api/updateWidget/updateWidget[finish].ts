import updateWidget from '../../services/widget/updateWidget.js';

export default async (request, response) => {
  const data = request.body;

  const widget = await updateWidget(request.params.id, data, {
    routeId: request.currentRoute.id
  });

  return widget;
};

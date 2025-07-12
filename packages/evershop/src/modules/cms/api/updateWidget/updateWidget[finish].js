import updateWidget from '../../services/widget/updateWidget.js';

export default async (request, response) => {
  const data = request.body;
  if (!data.route || (data.route.length === 1 && data.route[0] === '')) {
    data.route = [];
  }
  if (!data.area || (data.area.length === 1 && data.area[0] === '')) {
    data.area = [];
  }
  const widget = await updateWidget(request.params.id, data, {
    routeId: request.currentRoute.id
  });

  return widget;
};

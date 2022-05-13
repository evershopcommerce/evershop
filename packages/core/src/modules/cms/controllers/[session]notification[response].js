module.exports = (request, response) => {
  response.context.notifications = [...request.session.notifications || []];
  request.session.notifications = [];
};

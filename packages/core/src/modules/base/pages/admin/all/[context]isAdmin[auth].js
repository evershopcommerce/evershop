module.exports = (request, response) => {
  request.isAdmin = true;
  response.context.isAdmin = true;
};

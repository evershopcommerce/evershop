module.exports.getRouteBuildSubPath = function getRouteBuildSubPath(route) {
  const { id, isAdmin } = route;
  return isAdmin === true ? `admin/${id}` : `site/${id}`;
};
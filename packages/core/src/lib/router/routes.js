// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

const routes = [];

exports.routes = routes;

exports.getSiteRoutes = () => routes.filter((r) => r.isAdmin === false);
exports.getAdminRoutes = () => routes.filter((r) => r.isAdmin === true);
exports.getRoutes = () => routes;

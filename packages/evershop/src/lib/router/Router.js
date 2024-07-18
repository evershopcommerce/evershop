// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

class Router {
  constructor() {
    this.routes = [];
  }

  getFrontStoreRoutes() {
    return this.routes.filter((r) => r.isAdmin === false);
  }

  getAdminRoutes() {
    return this.routes.filter((r) => r.isAdmin === true);
  }

  getRoutes() {
    return this.routes;
  }

  addRoute(route) {
    const r = this.routes.find((rt) => rt.id === route.id);
    if (r !== undefined) {
      Object.assign(r, route);
    } else {
      this.routes.push(route);
    }
  }

  empty() {
    this.routes = [];
  }
}

const router = new Router();
exports.addRoute = (route) => router.addRoute(route);
exports.getFrontStoreRoutes = () => router.getFrontStoreRoutes();
exports.getAdminRoutes = () => router.getAdminRoutes();
exports.getRoutes = () => router.getRoutes();
exports.empty = () => router.empty();

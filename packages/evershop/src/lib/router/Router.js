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
export const addRoute = (route) => router.addRoute(route);
export const getFrontStoreRoutes = () => router.getFrontStoreRoutes();
export const getAdminRoutes = () => router.getAdminRoutes();
export const getRoutes = () => router.getRoutes();
export const empty = () => router.empty();

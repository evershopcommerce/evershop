import { sortRoutes } from './sortRoutes.js';

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
    return sortRoutes(this.routes);
  }

  addRoute(route) {
    const r = this.routes.find((rt) => rt.id === route.id);
    if (r !== undefined) {
      Object.assign(r, route);
    } else {
      this.routes.push(route);
    }
  }

  hasRoute(id) {
    return this.routes.some((r) => r.id === id);
  }

  deleteRoute(id) {
    this.routes = this.routes.filter((r) => r.id !== id);
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
export const hasRoute = (id) => router.hasRoute(id);
export const deleteRoute = (id) => router.deleteRoute(id);
export const getRoute = (id) => router.getRoutes().find((r) => r.id === id);
export const empty = () => router.empty();

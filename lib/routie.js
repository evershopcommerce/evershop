const { compile } = require('./pathToRegexp');

let routes = [];

module.exports = exports = {
    registerSiteRoute: (id, method, path) => {
        let route = validateRoute(id, method, path);
        route.isAdmin = false;
        routes.push(route);
    },

    registerAdminRoute: (id, method, path) => {
        let route = validateRoute(id, method, path);
        route.isAdmin = true;
        route.path === "/" ? "/admin" : "/admin" + path
        routes.push(route);
    },
    /**
     * This method will generate a url base on the routeID and params.
     * @param {*} routeId
     * @param {*} params
     */
    buildSiteUrl: function buildSiteUrl(routeId, params = {}) {
        let route = routes.find(r => r.id === routeId);
        if (route === undefined)
            throw new Error(`Route ${routeId} is not existed`);

        const toPath = compile(route["path"]);

        return toPath(params);
    },
    /**
     * This method will generate a url base on the routeID and params.
     * @param {*} routeId
     * @param {*} params
     */
    buildAdminUrl: function buildAdminUrl(routeId, params = {}) {
        let route = routes.find(r => r.id === routeId);
        if (route === undefined)
            throw new Error(`Route ${routeId} is not existed`);

        const toPath = compile(route["path"]);
        // TODO: Admin path should be configurable
        return toPath(params);
    },
    /**
     * This method will generate a url base on the routeID and params.
     * @param {*} routeId
     * @param {*} params
     */
    buildUrl: function buildUrl(routeId, params = {}) {
        let route = routes.find(r => r.id === routeId);
        if (route === undefined)
            throw new Error(`Route ${routeId} is not existed`);

        const toPath = compile(route["path"]);
        // TODO: Admin path should be configurable
        return toPath(params);
    },
    getSiteRoutes: () => routes.filter(r => r.isAdmin === false),
    getAdminRoutes: () => routes.filter(r => r.isAdmin === true),
    getRoutes: () => routes
}

function validateRoute(id, method, path) {
    if (/^[A-Za-z.]+$/.test(id) === false) // Route ID must contain letters only. Silently ignore invalid route
        throw new TypeError(`Route ID ${String(id)} is not valid`);

    if (routes.find(r => r.id === id) !== undefined)
        throw new Error(`Route with ID ${String(id)} is already existed`);

    return {
        id: String(id),
        method,
        path
    };
}
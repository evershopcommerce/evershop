const { compile } = require('./pathToRegexp');
module.exports = exports = (function () {
    let siteRoutes = {};
    let adminRoutes = {};

    return {
        registerSiteRoute: (id, method, path) => {
            if (/^[A-Za-z.]+$/.test(id) === false) // Route ID must contain letters only. Silently ignore invalid route
                return false;

            if (siteRoutes[String(id)] !== undefined)
                throw new Error(`Route with ID ${String(id)} is already existed`);

            siteRoutes[String(id)] = {
                id: String(id),
                method,
                path
            }
        },

        registerAdminRoute: (id, method, path) => {
            if (/^[A-Za-z.]+$/.test(id) === false) // Route ID must contain letters only. Silently ignore invalid route
                return false;

            if (adminRoutes[String(id)] !== undefined)
                throw new Error(`Route with ID ${String(id)} is already existed`);

            adminRoutes[String(id)] = {
                id: String(id),
                method,
                path: path === "/" ? "/admin" : "/admin" + path
            }
        },
        /**
         * This method will generate a url base on the routeID and params.
         * @param {*} routeId
         * @param {*} params
         */
        buildSiteUrl: function buildSiteUrl(routeId, params = {}) {
            let route = siteRoutes[routeId] || null;
            if (route === null)
                throw new Error(`${routeId} is not existed`);
            const toPath = compile(route["path"]);

            return toPath(params);
        },
        /**
         * This method will generate a url base on the routeID and params.
         * @param {*} routeId
         * @param {*} params
         */
        buildAdminUrl: function buildAdminUrl(routeId, params = {}) {
            let route = adminRoutes[routeId] || null;
            if (route === null)
                throw new Error(`Route ${routeId} is not existed`);

            const toPath = compile(route["path"]);
            // TODO: Admin path should be configurable
            return toPath(params);
        },
        getSiteRoutes: () => siteRoutes,
        getAdminRoutes: () => adminRoutes,
        all: () => { return { ...siteRoutes, ...adminRoutes } }
    }
})();
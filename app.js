const { readdirSync, existsSync } = require('fs');
const path = require("path");
const resolve = path.resolve;
const express = require("express");
const router = require("./lib/routie");
const { getModuleMiddlewares, get } = require('./lib/middee');
const debug = require('debug')('express:server');
const http = require('http');

/**
 * App prototype
 */
let app = module.exports = exports = {};

app.run = function init() {
    // Load Core Module
    loadCoreModule();
    // Install Core Module if it is not installed
    // Load extensions
    run();
}

function run() {
    // Load Express
    // Create Express application
    var expressApp = express();
    // Setup event listener
    let listeners = eventer.getListeners();

    listeners.forEach(l => expressApp.once(l.event, l.callback));

    let routes = router.all();
    let siteRoutes = router.getSiteRoutes();
    let adminRoutes = router.getAdminRoutes();

    for (let property in routes) {
        expressApp.all(routes[property].path, (request, response, next) => {
            request._route = routes[property];
            next();
        });
    }
    let middlewares = get();

    middlewares.forEach(m => {
        if (m.routeId === null)
            expressApp.use(m.middleware);
        else if (m.routeId === "admin") {
            for (let property in adminRoutes)
                if (adminRoutes.hasOwnProperty(property) && ((property !== "adminStaticAsset" && property !== "adminBundle") || m.id === "isAdmin")) {
                    let route = adminRoutes[property];
                    expressApp.all(route.path, m.middleware);
                }
        } else if (m.routeId === "site") {
            for (let property in siteRoutes)
                if (siteRoutes.hasOwnProperty(property) && property !== "staticAsset" && property !== "siteBundle") {
                    let route = siteRoutes[property];
                    expressApp.all(route.path, m.middleware);
                }
        } else {
            let route = routes[m.routeId];
            if (route !== undefined) {
                route.method.forEach(method => {
                    switch (method.toUpperCase()) {
                        case "GET":
                            expressApp.get(route.path, m.middleware);
                            break;
                        case "POST":
                            expressApp.post(route.path, m.middleware);
                            break;
                        case "PUT":
                            expressApp.put(route.path, m.middleware);
                            break;
                        case "DELETE":
                            expressApp.delete(route.path, m.middleware);
                            break;
                        default:
                            expressApp.get(route.path, m.middleware);
                            break;
                    }
                });
            }
        }
    })

    expressApp.listen(3000);
}

var eventer = (function () {
    let listeners = [];

    return {
        addListener: function (event, callback, priority) {
            priority = typeof (priority) === "number" ? priority : 0;
            listeners.push({
                event, callback, priority
            });
        },
        getListeners: () => listeners
    }
})();

function loadCoreModule() {
    const modules = readdirSync(path.resolve(__dirname, "./modules/"), { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    // Load routes.js from module
    modules.forEach(element => {
        try {
            getModuleMiddlewares(path.resolve(__dirname, "modules", element));
            if (existsSync(resolve(__dirname, "modules", element, "routes.js")))
                require(resolve(__dirname, "modules", element, "routes.js"))(router); // routes.js must return a function
            if (existsSync(resolve(__dirname, "modules", element, "bootstrap.js")))
                require(resolve(__dirname, "modules", element, "bootstrap.js"))(eventer); // bootstrap.js must return a function
        } catch (e) {
            throw e;
        }
    });
}

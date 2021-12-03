const { readdirSync, existsSync } = require('fs');
const path = require("path");
const resolve = path.resolve;
const express = require("express");
const router = require("../../src/lib/routie");
const { getModuleMiddlewares, get } = require('../../src/lib/middee');
const http = require('http');
const { addComponents } = require('../../src/lib/componee');
const debug = require('debug')('express:server');

/* Loading modules and initilize routes, components and services */
const modules = readdirSync(path.resolve(__dirname, "../../src/modules/"), { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

modules.forEach(element => {
    try {
        getModuleMiddlewares(path.resolve(__dirname, "../../src/modules", element));
        if (existsSync(resolve(__dirname, "../../src/modules", element, "routes.js")))
            require(resolve(__dirname, "../../src/modules", element, "routes.js"))(router); // routes.js must return a function
    } catch (e) {
        throw e;
        process.exit(0);
    }
});

modules.forEach(element => {
    try {
        if (existsSync(resolve(__dirname, "../../src/modules", element, "components/site/components.js"))) {
            let components = require(resolve(__dirname, "../../src/modules", element, "components/site/components.js"));
            if (typeof components === 'object' && components !== null) {
                addComponents("site", components);
            }
        }
        if (existsSync(resolve(__dirname, "../../src/modules", element, "components/admin/components.js"))) {
            let components = require(resolve(__dirname, "../../src/modules", element, "components/admin/components.js"));
            if (typeof components === 'object' && components !== null) {
                addComponents("admin", components);
            }
        }
    } catch (e) {
        throw e;
        process.exit(0);
    }
});

// TODO: load plugins (extensions), themes

/* Create an express application */
let app = express();

// Setup event listener
//let listeners = eventer.getListeners();

//listeners.forEach(l => app.once(l.event, l.callback));

let routes = router.getRoutes();
let siteRoutes = router.getSiteRoutes();
let adminRoutes = router.getAdminRoutes();

routes.forEach(r => {
    app.all(r.path, (request, response, next) => {
        request._route = r;
        next();
    });

    /** 405 Not Allowed handle */
    app.all(r.path, (request, response, next) => {
        if (request._route && !request._route.method.includes(request.method)) {
            response.status(405).send("Method Not Allowed");
        } else {
            next();
        }
    });

    r.__BUILDREQURIED__ = true;
})
/** 404 Not Found handle */
// TODO: This has to be enhanced, to support some cases like user visit the valid product route, but the product is either removed or disabled
app.all('*', (request, response, next) => {
    if (!request._route) {
        response.status(404).send("Not Found");
    } else {
        next();
    }
});

let middlewares = get();
middlewares.forEach(m => {
    if (m.routeId === null)
        app.use(m.middleware);
    else if (m.routeId === "admin") {
        adminRoutes.forEach(route => {
            if ((route.id !== "adminStaticAsset") || m.id === "isAdmin") {
                app.all(route.path, m.middleware);
            }
        })
    } else if (m.routeId === "site") {
        siteRoutes.forEach(route => {
            if (route.id !== "staticAsset") {
                app.all(route.path, m.middleware);
            }
        })
    } else {
        let route = routes.find(r => r.id === m.routeId);
        if (route !== undefined) {
            route.method.forEach(method => {
                switch (method.toUpperCase()) {
                    case "GET":
                        app.get(route.path, m.middleware);
                        break;
                    case "POST":
                        app.post(route.path, m.middleware);
                        break;
                    case "PUT":
                        app.put(route.path, m.middleware);
                        break;
                    case "DELETE":
                        app.delete(route.path, m.middleware);
                        break;
                    default:
                        app.get(route.path, m.middleware);
                        break;
                }
            });
        }
    }
});

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    debug('Listening on ' + bind);
}
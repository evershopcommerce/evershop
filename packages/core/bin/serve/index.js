const { readdirSync, existsSync } = require('fs');
const path = require("path");
const express = require("express");
const http = require('http');
const debug = require('debug')('express:server');
let src = process.env.NODE_ENV === "development" ? path.resolve(__dirname, "../../src") : path.resolve(__dirname, "../../src");
const { getModuleMiddlewares, get } = require(path.join(src, "lib/middee"));
const { addComponents } = require(path.join(src, "lib/componee"));
const router = require(path.join(src, "lib/routie"));
const colors = require('colors');
const ora = require('ora');
const boxen = require('boxen');

const spinner = ora({
    text: colors.green("NodeJsCart is starting"),
    spinner: "dots12"
}).start();
spinner.start();

/* Loading modules and initilize routes, components and services */
const modules = readdirSync(path.join(src, "modules"), { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

modules.forEach(element => {
    try {
        getModuleMiddlewares(path.join(src, "modules", element));
        if (existsSync(path.join(src, "modules", element, "routes.js")))
            require(path.join(src, "modules", element, "routes.js"))(router); // routes.js must return a function
    } catch (e) {
        spinner.fail(colors.red(e) + "\n");
        process.exit(0);
    }
});

modules.forEach(element => {
    try {
        if (existsSync(path.join(src, "modules", element, "components/site/components.js"))) {
            let components = require(path.join(src, "modules", element, "components/site/components.js"));
            if (typeof components === 'object' && components !== null) {
                addComponents("site", components);
            }
        }
        if (existsSync(path.join(src, "modules", element, "components/admin/components.js"))) {
            let components = require(path.join(src, "modules", element, "components/admin/components.js"));
            if (typeof components === 'object' && components !== null) {
                addComponents("admin", components);
            }
        }
    } catch (e) {
        spinner.fail(colors.red(e) + "\n");
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

    r.__BUILDREQUIRED__ = true;
})
/** 404 Not Found handle */
// TODO: This has to be enhanced, to support some cases like user visit the valid product route, but the product is either removed or disabled
app.all('*', (request, response, next) => {
    if (!request._route) {
        response.status(404);
        request._route = siteRoutes.find((r) => r.id === "notFound");
        next();
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
        app.all("*", (request, response, next) => {
            let route = request._route;
            if (route.isAdmin === true || route.id === "staticAsset") {
                return next();
            } else {
                m.middleware(request, response, next);
            }
        });
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
            spinner.fail(colors.red(bind + ' requires elevated privileges') + "\n");
            process.exit(1);
            break;
        case 'EADDRINUSE':
            spinner.fail(colors.red(bind + ' is already in use') + "\n");
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
    spinner.succeed(colors.green("Done!!!\n") + boxen(colors.green('Your website is running at "http://localhost:3000"'), { title: 'NodeJsCart', titleAlignment: 'center', padding: 1, margin: 1, borderColor: 'green' }))
    var addr = server.address();
    var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    debug('Listening on ' + bind);
}
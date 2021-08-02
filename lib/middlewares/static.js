const staticMiddleware = require("serve-static");
const path = require("path");
const { existsSync, lstatSync } = require("fs");
const { CONSTANTS } = require("../helpers");

module.exports = exports = (request, response, next) => {
    let _path;
    if (request.isAdmin === true) {
        _path = path.normalize(request.path.replace("/admin/assets/", ""));
    } else {
        _path = path.normalize(request.path.replace("/assets/", ""));
    }
    if (request.isAdmin === true) {
        request.originalUrl = request.originalUrl.replace("/admin/assets", "");
        request.url = request.url.replace("/admin/assets", "");
    } else {
        request.originalUrl = request.originalUrl.replace("/assets", "");
        request.url = request.url.replace("/assets", "");
    }

    if (existsSync(path.join(CONSTANTS.ROOTPATH, 'theme', _path))) {
        staticMiddleware("theme")(request, response, next);
    } else if (existsSync(path.join(CONSTANTS.MEDIAPATH, _path))) {
        staticMiddleware('media')(request, response, next);
    } else if (existsSync(path.join(CONSTANTS.ROOTPATH, ".nodejscart/build", _path))) {
        staticMiddleware(path.join(CONSTANTS.ROOTPATH, ".nodejscart/build"))(request, response, next);
    } else if (existsSync(path.join(CONSTANTS.ROOTPATH, "node_modules", "@nodejscart/core/theme", _path))) {
        staticMiddleware(path.join(CONSTANTS.ROOTPATH, "node_modules", "@nodejscart/core/theme"))(request, response, next);
    } else {
        response.status(404).send("Not Found")
    }
    // TODO: Prevent directory listing
}
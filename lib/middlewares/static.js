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
    if (!existsSync(path.join(CONSTANTS.PUBLICPATH, _path)) || lstatSync(path.join(CONSTANTS.PUBLICPATH, _path)).isDirectory()) {
        response.status(404).send("Not Found")
    } else {
        if (request.isAdmin === true) {
            request.originalUrl = request.originalUrl.replace("/admin/assets", "");
            request.url = request.url.replace("/admin/assets", "");
        } else {
            request.originalUrl = request.originalUrl.replace("/assets", "");
            request.url = request.url.replace("/assets", "");
        }
        staticMiddleware("public")(request, response, next);
    }
}
const path = require("path");
const { existsSync, readFileSync } = require('fs');
const config = require('config');

let helpers = module.exports = exports = {};

helpers.getConfig = (function () {
    let config = {};
    if (existsSync(path.resolve(__dirname, "../.nodejscart/config.json"))) {
        config = JSON.parse(readFileSync(path.resolve(__dirname, "../.nodejscart/config.json")));
    }

    return function getConfig(name, defaultValue = null) {
        if (config[name] !== undefined)
            return config[name];
        else
            return defaultValue;
    }
})();

helpers.getAdminCssFile = function getAdminCssFile(path) {
    const adminTheme = config.get("shop.adminTheme");

    return `/admin/${adminTheme}/css/${path}`;
}

helpers.getAdminJsFile = function getAdminJsFile(_path) {
    const adminTheme = config.get("shop.adminTheme");
    if (existsSync(path.resolve(__dirname, "../public", "theme", "admin", adminTheme, _path)))
        return `/admin/${adminTheme}/js/${_path}`;
    else
        return `/js/${_path}`;
}

helpers.getSiteCssFile = function getSiteCssFile(path) {
    const theme = config.get("shop.frontTheme");

    return `/site/${theme}/css/${path}`;
}

helpers.getSiteJsFile = function getSiteJsFile(path) {
    const theme = config.get("shop.frontTheme");
    if (existsSync(path.resolve(__dirname, "../public", "theme", "site", theme, _path)))
        return `/site/${theme}/js/${_path}`;
    else
        return `/js/${_path}`;
}

const rootPath = (() => {
    let _path = path.resolve(__dirname, "..", "..", "..", "..");
    if (existsSync(path.resolve(_path, "package-lock.json"))) {
        return _path;
    } else {
        return path.resolve(__dirname, "..", "..", "..", "..", "..");
    }
})();

helpers.CONSTANTS = Object.freeze({
    ROOTPATH: rootPath,
    LIBPATH: path.resolve(__dirname),
    MOLDULESPATH: path.resolve(__dirname, "..", "modules"),
    PUBLICPATH: path.resolve(rootPath, "public"),
    MEDIAPATH: path.resolve(rootPath, "media"),
    NODEMODULEPATH: path.resolve(rootPath, "node_modules"),
    ADMINTHEMEPATH: path.resolve(rootPath, "themes", "admin"),
    SITETHEMEPATH: path.resolve(rootPath, "themes", "site"),
    CACHEPATH: path.resolve(rootPath, ".nodejscart"),
})
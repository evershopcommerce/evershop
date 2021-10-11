const path = require("path");
const { existsSync, readFileSync } = require('fs');
let helpers = module.exports = exports = {};
const config = require('config');

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

/**
 * This function will load a component from sub path.
 * This is sub-path started from module level.
 * For example:
 * Catalog module: "catalog/components/products.js"
 * To overwrite this, create a sub-folder with same structure in theme folder
 * @param {String} subPath
 */
helpers.getComponentSource = function getComponentSource(_path, isAdmin = false) {
    let p;
    const theme = isAdmin === true ? config.get("shop.adminTheme") : config.get("shop.frontTheme");
    if (existsSync(path.resolve(helpers.CONSTANTS.PUBLICPATH, "theme", "admin", theme, _path)))
        p = path.resolve(helpers.CONSTANTS.PUBLICPATH, "theme", "admin", theme, _path);
    else if (existsSync(path.resolve(helpers.CONSTANTS.PUBLICPATH, "theme", "admin", "default", _path)))
        p = path.resolve(helpers.CONSTANTS.PUBLICPATH, "theme", "admin", "default", _path);
    else if (existsSync(path.resolve(helpers.CONSTANTS.MOLDULESPATH, _path)))
        p = path.resolve(helpers.CONSTANTS.MOLDULESPATH, _path);
    else if (existsSync(path.resolve(__dirname, "components", _path)))
        p = path.resolve(__dirname, "components", _path);
    else
        p = null;
    if (p === null)
        throw new Error(`${_path} does not exist`);

    return p;
}

const rootPath = (() => {
    let _path = path.resolve(__dirname, "..", '..');
    if (existsSync(path.resolve(_path, "package-lock.json"))) {
        return _path;
    } else {
        return path.resolve(__dirname, "..", "..", "..", "..", "..");
    }
})();

helpers.CONSTANTS = Object.freeze({
    ROOTPATH: rootPath,
    LIBPATH: path.resolve(__dirname),
    MOLDULESPATH: path.resolve(__dirname, "modules"),
    PUBLICPATH: path.resolve(rootPath, "public"),
    MEDIAPATH: path.resolve(rootPath, "media"),
    NODEMODULEPATH: path.resolve(rootPath, "node_modules"),
    ADDMINTHEMEPATH: path.resolve(rootPath, "public", "theme", "admin"),
    SITETHEMEPATH: path.resolve(rootPath, "public", "theme", "front"),
    CACHEPATH: path.resolve(rootPath, ".nodejscart"),
})
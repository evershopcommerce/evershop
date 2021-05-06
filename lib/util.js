const path = require("path");
const { existsSync, readFileSync } = require('fs');
var util = module.exports = exports = {};

util.getConfig = (function () {
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

util.getAdminCssFile = function getAdminCssFile(path) {
    const adminTheme = util.getConfig("adminTheme", "default");

    return `/theme/admin/${adminTheme}/css/${path}`;
}


util.getAdminJsFile = function getAdminJsFile(_path) {
    const adminTheme = util.getConfig("adminTheme", "default");
    if (existsSync(path.resolve(__dirname, "../public", "theme", "admin", adminTheme, _path)))
        return `/theme/admin/${adminTheme}/js/${_path}`;
    else
        return `/js/${_path}`;
}

util.getSiteCssFile = function getSiteCssFile(path) {
    const theme = util.getConfig("theme", "default");

    return `/theme/site/${theme}/css/${path}`;
}
/**
 * This function will load a component from sub path.
 * This is sub-path started from module level.
 * For example:
 * Catalog module: "catalog/components/products.js"
 * To overwrite this, create a sub-folder with same structure in theme folder
 * @param {String} subPath
 */
util.getComponentSource = function getComponentSource(_path, isAdmin = false) {
    let p;
    const theme = isAdmin === true ? util.getConfig("adminTheme") : util.getConfig("fontTheme");
    if (existsSync(path.resolve(__dirname, "../public", "theme", "admin", theme, _path)))
        p = path.resolve(__dirname, "../public", "theme", "admin", theme, _path);
    else if (existsSync(path.resolve(__dirname, "../public", "theme", "admin", "default", _path)))
        p = path.resolve(__dirname, "../public", "theme", "admin", "default", _path);
    else if (existsSync(path.resolve(__dirname, "../nodejscart", _path)))
        p = path.resolve(__dirname, "../nodejscart", _path);
    else if (existsSync(path.resolve(__dirname, "components", _path)))
        p = path.resolve(__dirname, "components", _path);
    else
        p = null;
    if (p === null)
        throw new Error(`${_path} does not exist`);

    return p;
}

util.CONSTANTS = Object.freeze({
    ROOTPATH: path.resolve(__dirname, ".."),
    LIBPATH: path.resolve(__dirname),
    PUBLICPATH: path.resolve(__dirname, "..", "public"),
    MEDIAPATH: path.resolve(__dirname, "..", "public", "media"),
    NODEMODULEPATH: path.resolve(__dirname, "..", "node_modules"),
    ADDMINTHEMEPATH: path.resolve(__dirname, "..", "public", "theme", "admin"),
    SITETHEMEPATH: path.resolve(__dirname, "..", "public", "theme", "front"),
    CACHEPATH: path.resolve(__dirname, "..", ".nodejscart"),
})
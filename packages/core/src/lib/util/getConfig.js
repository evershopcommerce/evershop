let config = require("config");

function getConfig(path, defaultValue) {
    try {
        return config.get(path);
    } catch (e) {
        return defaultValue
    }
}

module.exports = exports = { getConfig }
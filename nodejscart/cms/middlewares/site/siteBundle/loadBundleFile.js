const path = require("path");
const fs = require("fs");
const { CONSTANTS } = require("../../../../../lib/util");

module.exports = (request, response) => {
    response.set('Content-Type', 'application/javascript')
    let _path = request.params[0] || null;
    if (request.isAdmin == true) {
        _path = "admin/" + _path;
    } else {
        _path = "site/" + _path;
    }
    if (!_path) {
        response.$body = "";
        return response;
    }
    return new Promise((resolve, reject) => {
        var timer = 0;
        var check = setInterval(function () {
            // We only wait for 1 min maximum for the bundle
            if (timer > 60000) {
                clearInterval(check);
                response.$body = "timedout";
                resolve(1);
            }
            if (fs.existsSync(path.resolve(CONSTANTS.ROOTPATH, "./.nodejscart/", _path, "bundle.js"))) {
                clearInterval(check);
                fs.readFile(path.resolve(CONSTANTS.ROOTPATH, "./.nodejscart/", _path, "bundle.js"), "utf8", (err, data) => {
                    if (err) throw err;
                    response.$body = data;
                    resolve(1);
                })
            }
            timer += 200;
        }, 200);
    })
}
const { CONSTANTS } = require("../../../../../lib/helpers");
const { join, basename } = require("path");
const { existsSync, mkdirSync } = require("fs");

module.exports = (request, response) => {
    let path = request.params[0] || "";
    if (existsSync(join(CONSTANTS.MEDIAPATH, path))) {
        response.json({
            success: false,
            message: "Folder already existed",
            data: {}
        });
    } else {
        mkdirSync(join(CONSTANTS.MEDIAPATH, path), { recursive: true });
        response.json({
            success: true,
            data: {
                path: path,
                name: basename(join(CONSTANTS.MEDIAPATH, path))
            }
        });
    }

    return "STOP";
}
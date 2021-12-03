const { CONSTANTS } = require("../../../../../lib/helpers");
const { join } = require("path");
const { existsSync, unlinkSync, lstatSync } = require("fs");

module.exports = (request, response) => {
    let path = request.params[0] || "";
    if (!existsSync(join(CONSTANTS.MEDIAPATH, path))) {
        response.json({
            success: false,
            message: "Requested path does not exist"
        });
    } else {
        if (lstatSync(join(CONSTANTS.MEDIAPATH, path)).isDirectory()) {
            response.json({
                success: false,
                message: "Requested path is not a file"
            });
        } else {
            unlinkSync(join(CONSTANTS.MEDIAPATH, path));
            response.json({
                success: true
            });
        }
    }

    return "STOP";
}
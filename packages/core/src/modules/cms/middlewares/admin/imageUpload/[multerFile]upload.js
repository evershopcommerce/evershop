const { CONSTANTS } = require('../../../../../lib/helpers');
const { resolve } = require('path');
const { buildAdminUrl } = require("../../../../../lib/routie");

module.exports = (request, response) => {
    if (!request.files || request.files.length === 0) {
        response.json({
            success: false,
            message: "No image was provided"
        })
    } else {
        response.json({
            success: true,
            message: "OK",
            data: {
                files: request.files.map(
                    (f) => {
                        return {
                            "name": f.filename,
                            "type": f.minetype,
                            "size": f.size,
                            "path": f.path.replace(resolve(CONSTANTS.MEDIAPATH), "").split("\\").join("/"),
                            "url": buildAdminUrl("adminStaticAsset", [f.path.replace(resolve(CONSTANTS.MEDIAPATH), "").split("\\").join("/")])
                        }
                    }
                )
            }
        })
    }

    return "STOP";
}
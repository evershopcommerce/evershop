var { mkdirSync } = require('fs');
var { CONSTANTS } = require('../../../../../lib/helpers');
var { resolve, join } = require('path');
var multer = require('multer');

var storage = multer.diskStorage({
    destination: function (request, file, cb) {
        let path = join(CONSTANTS.MEDIAPATH, (request.params[0] || "").replace(/\s/g, '-'));
        mkdirSync(path, { recursive: true });
        cb(null, path)
    },
    filename: function (request, file, cb) {
        cb(null, file.originalname.replace(/\s/g, '-'))
    }
});

function fileFilter(request, file, cb) {
    // Only accept images
    if (!/\.(jpe?g|png|gif)$/i.test(file.originalname))
        cb(null, false)
    else
        cb(null, true)
}

var upload = multer({ storage: storage, fileFilter: fileFilter })

module.exports = (request, response, stack, next) => {
    let path = request.params[0] || "";
    if (path !== "" && !/^[a-z0-9\/]+$/i.test(path)) {
        response.json({ success: false, message: "Invalid path" });
    } else {
        upload.array('images', 20)(request, response, next);
    }
}
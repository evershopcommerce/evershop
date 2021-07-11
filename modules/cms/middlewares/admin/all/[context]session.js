var session = require("express-session");
var FileStore = require("session-file-store")(session);
const { CONSTANTS } = require("../../../../../lib/helpers");

module.exports = (request, response, stack, next) => {
    session({
        name: "adminID",
        resave: false,
        saveUninitialized: true,
        secret: 'somesecret',
        store: new FileStore({ path: CONSTANTS.ROOTPATH + "/.nodejscart/sessions" }),
        cookie: { secure: false, httpOnly: false }
    })(request, response, next);
}
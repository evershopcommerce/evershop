const { Handler } = require("./Handler");
const { noDublicateId } = require("./noDuplicateId");

module.exports.addMiddleware = function addMiddleware(middleware) {
  if (noDublicateId(Handler.middlewares, middleware)) {
    Handler.addMiddleware(middleware);
  } else {
    console.error(`Duplicate middleware id: ${middleware.id}`);
  }
}
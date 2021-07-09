var express = require('express');
var staticMiddleware = express.static('public');

module.exports = (request, response, stack, next) => {
    staticMiddleware(request, response, next);
}
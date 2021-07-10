module.exports = (request, response, stack) => {
    response.context = {};
    /** Some default context value */
    response.context.homeUrl = request.protocol + '://' + request.get('host');
    response.context.currentUrl = request.protocol + '://' + request.get('host') + request.originalUrl;;
}